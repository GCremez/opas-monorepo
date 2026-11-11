# Opas on one free server

Runs the Opas backend with PostgreSQL (pgvector), Redis, RabbitMQ and Presidio (with
Finnish and Swedish models) on a single Linux server, with HTTPS from Caddy. S3,
Textract, SES and Claude (Amazon Bedrock) stay on AWS and are billed per use.

Tested shape: an **Oracle Cloud Always Free** Ampere (ARM) VM, 2 OCPU / 12 GB RAM.
Opas needs about 4 GB. Any Linux VM with Docker works the same (x86-64 too).

## 1. Create the server (Oracle Cloud)

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

Create an IAM user (e.g. `opas-server`) with an access key and this policy. Replace
`BUCKET` with your bucket name, and `noreply@getopas.app` with your SES sender.

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

Create the S3 bucket in **eu-north-1** (block all public access). Put the key and
bucket name in `.env`.

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

Fill in the AWS values. `chmod 600 .env`.

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
