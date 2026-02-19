-- Token 过期支持：增加 expires_at 列，默认 7 天后过期
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 已有 token 补齐过期时间
UPDATE user_tokens SET expires_at = created_at + INTERVAL '7 days' WHERE expires_at IS NULL;

-- 设为 NOT NULL + 默认值
ALTER TABLE user_tokens ALTER COLUMN expires_at SET DEFAULT now() + INTERVAL '7 days';
ALTER TABLE user_tokens ALTER COLUMN expires_at SET NOT NULL;
