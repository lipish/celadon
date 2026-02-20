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
    ('LLM_PLANNER_MODEL', 'deepseek/deepseek-chat', 'Model for requirements clarification and planning'),
    ('LLM_EXECUTOR_MODEL', 'deepseek/deepseek-coder', 'Model for code generation and technical execution'),
    ('LLM_REFLECTOR_MODEL', 'deepseek/deepseek-chat', 'Model for code review and design reflection'),
    ('CELADON_LLM_MODEL', 'deepseek/deepseek-chat', 'Default fallback model')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
