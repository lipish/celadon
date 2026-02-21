-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed with placeholders for common keys
INSERT INTO system_settings (key, value, description)
VALUES 
    ('DEEPSEEK_API_KEY', '', 'DeepSeek API Key'),
    ('OPENAI_API_KEY', '', 'OpenAI API Key'),
    ('LLM_API_KEY', '', 'Generic LLM API Key (backup)'),
    ('CELADON_LLM_MODEL', 'deepseek-chat', 'The model name to use for LLM calls')
ON CONFLICT DO NOTHING;
