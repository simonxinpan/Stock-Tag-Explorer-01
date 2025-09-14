-- 创建本地测试数据库和表结构

-- 创建数据库（如果不存在）
-- CREATE DATABASE stock_explorer;

-- 连接到数据库
\c stock_explorer;

-- 创建中概股表
CREATE TABLE IF NOT EXISTS chinese_stocks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    market_cap BIGINT,
    price DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    volume BIGINT,
    sector VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    website VARCHAR(255),
    employees INTEGER,
    founded_year INTEGER,
    headquarters VARCHAR(255),
    exchange VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'USD',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_chinese_stocks_ticker ON chinese_stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_chinese_stocks_sector ON chinese_stocks(sector);
CREATE INDEX IF NOT EXISTS idx_chinese_stocks_market_cap ON chinese_stocks(market_cap);

-- 插入一些测试数据
INSERT INTO chinese_stocks (ticker, company_name, sector, exchange) VALUES 
('BABA', 'Alibaba Group Holding Limited', 'Technology', 'NYSE'),
('JD', 'JD.com Inc', 'Technology', 'NASDAQ'),
('BIDU', 'Baidu Inc', 'Technology', 'NASDAQ'),
('NIO', 'NIO Inc', 'Automotive', 'NYSE'),
('PDD', 'PDD Holdings Inc', 'Technology', 'NASDAQ')
ON CONFLICT (ticker) DO NOTHING;

-- 显示表结构
\d chinese_stocks;

-- 显示当前数据
SELECT ticker, company_name, sector FROM chinese_stocks;