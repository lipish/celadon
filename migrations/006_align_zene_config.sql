-- Align system settings with Zene configuration pattern (Provider + API Key + Model)

-- Planner
INSERT INTO system_settings (key, value, description) VALUES
    ('ZENE_PLANNER_PROVIDER', 'deepseek', 'AI provider for the Planner role'),
    ('ZENE_PLANNER_API_KEY', '', 'API Key for the Planner role'),
    ('ZENE_PLANNER_MODEL', 'deepseek-chat', 'AI model for the Planner role');

-- Executor
INSERT INTO system_settings (key, value, description) VALUES
    ('ZENE_EXECUTOR_PROVIDER', 'openai', 'AI provider for the Executor role'),
    ('ZENE_EXECUTOR_API_KEY', '', 'API Key for the Executor role'),
    ('ZENE_EXECUTOR_MODEL', 'gpt-4o', 'AI model for the Executor role');

-- Reflector
INSERT INTO system_settings (key, value, description) VALUES
    ('ZENE_REFLECTOR_PROVIDER', 'deepseek', 'AI provider for the Reflector role'),
    ('ZENE_REFLECTOR_API_KEY', '', 'API Key for the Reflector role'),
    ('ZENE_REFLECTOR_MODEL', 'deepseek-chat', 'AI model for the Reflector role');

-- Advanced / Memory
INSERT INTO system_settings (key, value, description) VALUES
    ('ZENE_USE_SEMANTIC_MEMORY', 'false', 'Enable/disable semantic memory (RAG). Recommended: false for lower RAM usage.');

-- Add Minimax and Zhipu keys here instead of 004 to avoid checksum errors
INSERT INTO system_settings (key, value, description) VALUES
    ('MINIMAX_API_KEY', '', 'Minimax API Key'),
    ('ZHIPU_API_KEY', '', 'Zhipu (GLM) API Key')
ON CONFLICT DO NOTHING;

-- Migrate old keys to new ZENE_ prefix if they exist and are useful
UPDATE system_settings SET value = (SELECT value FROM system_settings WHERE key = 'DEEPSEEK_API_KEY') 
WHERE key = 'ZENE_PLANNER_API_KEY' AND (SELECT value FROM system_settings WHERE key = 'DEEPSEEK_API_KEY') != '' 
AND EXISTS (SELECT 1 FROM system_settings WHERE key = 'DEEPSEEK_API_KEY');

UPDATE system_settings SET value = (SELECT value FROM system_settings WHERE key = 'OPENAI_API_KEY') 
WHERE key = 'ZENE_EXECUTOR_API_KEY' AND (SELECT value FROM system_settings WHERE key = 'OPENAI_API_KEY') != ''
AND EXISTS (SELECT 1 FROM system_settings WHERE key = 'OPENAI_API_KEY');
