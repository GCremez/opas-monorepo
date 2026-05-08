-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Row Level Security will be enabled per-table by Flyway migrations
-- This init script just ensures extensions are available
