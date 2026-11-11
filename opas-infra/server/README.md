# Opas on one free server

Runs the Opas backend with PostgreSQL (pgvector), Redis, RabbitMQ and Presidio (with
Finnish and Swedish models) on a single Linux server, with HTTPS from Caddy. S3,
Textract, SES and Claude (Amazon Bedrock) stay on AWS and are billed per use.

Two ways to get the server for free at the start:

- **A. Amazon EC2 on your AWS credits (no new account).** New AWS accounts get $100 in
  credits, plus up to $100 more for trying services. A **t4g.medium** (2 ARM cores, 4 GB)
  in Stockholm costs about $25-30/month with disk and IP, so the credits cover roughly
  3-6 months. On AWS's Free plan you can't be charged: when the credits or the 6 months
  run out, AWS asks you to upgrade first.
- **B. Oracle Cloud Always Free** (new account, card verification): an ARM VM with
  2 cores and 12 GB, free with no time limit.

Opas needs about 4 GB; the memory limits in `docker-compose.yml` add up to that.

## 1A. Create the server on AWS (EC2)

All in **Europe (Stockholm) eu-north-1**.

1. **IAM role for the server** (so no access keys are stored on it): IAM → Roles → Create
   role → *AWS service: EC2* → create it without policies, name it `opas-server`, then
   add the policy from step 4 as an inline policy.
2. **EC2 → Launch instance:**
   - Name: `opas-server`
   - Image: **Ubuntu Server 24.04 LTS**, architecture **64-bit (Arm)**
   - Instance type: **t4g.medium**
   - Key pair: **Create new key pair** (RSA, .pem) and keep the file safe
   - Network settings: allow **SSH from My IP**, and **HTTP and HTTPS from the internet**
   - Storage: **20 GiB gp3**
   - Advanced details → IAM instance profile: **opas-server**
   - Advanced details → **Metadata response hop limit: 2**. Docker containers are one
     network hop further away, and with the default of 1 the backend can't get the
     role's credentials (S3, Textract, Bedrock calls fail). On a running instance:
     `aws ec2 modify-instance-metadata-options --instance-id <id> --http-put-response-hop-limit 2 --http-endpoint enabled --region eu-north-1`
3. **Fixed IP address:** EC2 → Elastic IPs → Allocate → Associate with `opas-server`.
   (Public IPv4 addresses cost the same either way; this one doesn't change on reboot.)
4. **Connect:** `ssh -i opas-server.pem ubuntu@<elastic-ip>`
5. **Swap** (a cushion for the 4 GB of memory):
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

With the IAM role attached, leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty in
`.env`: the backend picks up the role's credentials itself.

## 1B. Or: create the server on Oracle Cloud

1. Sign up at oracle.com/cloud/free. **Choose an EU home region** (Stockholm or
   Frankfurt): Always Free resources live in the home region, and it can't be changed.
2. Compute → Instances → Create instance:
   - Image: **Canonical Ubuntu 24.04** (aarch64)
   - Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPU, 12 GB memory
   - Add your SSH public key. Keep "Assign a public IPv4 address" on.
   - If it says "out of host capacity", try another availability domain or later.
3. Open ports 80 and 443:
   - Networking → your VCN → Security List → add ingress rules for TCP 80 and 443
     from `0.0.0.0/0`.
   - On the VM (Oracle's Ubuntu images block them in iptables too):
     ```bash
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```
4. Outside AWS there's no instance role: create an IAM **user** with the policy from step 4
   and an access key, and put the key in `.env`.

## 2. Point the domain at it

Add a DNS **A record**: `api.getopas.app` → the VM's public IP. Caddy can only get the
HTTPS certificate once this resolves.

## 3. Install Docker and get the code

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/GCremez/opas-monorepo.git
cd opas-monorepo/opas-infra/server
cp .env.example .env
```

## 4. AWS access for the server

This policy goes on the `opas-server` IAM role (EC2) or IAM user (Oracle). Replace
`BUCKET` with your bucket name, and `no-reply@getopas.app` with your SES sender.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET/*" },
    { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::BUCKET" },
    { "Effect": "Allow", "Action": "textract:DetectDocumentText", "Resource": "*" },
    { "Effect": "Allow", "Action": "ses:SendEmail", "Resource": "*",
      "Condition": { "StringEquals": { "ses:FromAddress": "no-reply@getopas.app" } } },
    { "Effect": "Allow", "Action": "bedrock-mantle:CreateInference", "Resource": "*",
      "Condition": { "StringEquals": { "aws:RequestedRegion": "eu-north-1" } } }
  ]
}
```

Create the S3 bucket in **eu-north-1** (block all public access) and put its name in
`.env` (plus the access key, on Oracle).

## 5. Fill in `.env`

```bash
# Service passwords
for v in POSTGRES_PASSWORD REDIS_PASSWORD RABBITMQ_PASSWORD; do
  sed -i "s|^$v=.*|$v=$(openssl rand -hex 24)|" .env
done

# JWT keys, as one line each
openssl genrsa -out private.pem 2048
openssl pkcs8 -topk8 -nocrypt -in private.pem -out private-pkcs8.pem
openssl rsa -in private.pem -pubout -out public.pem
echo "JWT_PRIVATE_KEY=$(awk 'NF {printf "%s\\n", $0}' private-pkcs8.pem)"
echo "JWT_PUBLIC_KEY=$(awk 'NF {printf "%s\\n", $0}' public.pem)"
# paste those two lines into .env, then: shred -u private.pem private-pkcs8.pem public.pem
```

Fill in the AWS values (on EC2 with the role: only `S3_BUCKET_NAME`). `chmod 600 .env`.

## 6. Start it

```bash
docker compose up -d --build     # first build takes ~10 minutes (Java, language models)
docker compose ps                # everything "healthy" / "running"
curl https://api.getopas.app/actuator/health
```

Point the app at it: `EXPO_PUBLIC_API_BASE_URL=https://api.getopas.app/api/v1`
(already the value in `opas-mobile/eas.json`).

## Updating

```bash
cd ~/opas-monorepo && git pull
cd opas-infra/server && docker compose up -d --build
```

## Backups

The database is the only state on the server (files are in S3). Daily dump, keep 14:

```bash
mkdir -p ~/backups
( crontab -l 2>/dev/null; echo '0 3 * * * cd ~/opas-monorepo/opas-infra/server && docker compose exec -T postgres pg_dump -U opas opas | gzip > ~/backups/opas-$(date +\%F).sql.gz && find ~/backups -name "opas-*.sql.gz" -mtime +14 -delete' ) | crontab -
```

Copy backups off the server now and then (e.g. to the S3 bucket).

## Notes

- Only Caddy is reachable from the internet; the other services are on Docker's internal
  network. `/actuator/prometheus` is not exposed.
- The privacy policy should list where the server runs (Oracle Cloud, your region).
- Always Free compute can be reclaimed by Oracle if it sits idle for long periods; a beta
  with real traffic keeps it busy. Keep the backups.
