CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID         NOT NULL UNIQUE REFERENCES users(id),
    stripe_customer_id      VARCHAR(255),
    stripe_subscription_id  VARCHAR(255),
    tier                    VARCHAR(32)  NOT NULL DEFAULT 'free',
    status                  VARCHAR(32)  NOT NULL DEFAULT 'active',
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id              ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id   ON subscriptions (stripe_customer_id);
