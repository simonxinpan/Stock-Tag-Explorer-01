#!/usr/bin/env node

/**
 * Stock-Tag-Explorer Vercel部署脚本
 * 自动化部署到Vercel平台
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

class VercelDeployer {
    constructor() {
        this.projectName = 'stock-tag-explorer';
        this.projectPath = process.cwd();
        this.publicPath = path.join(this.projectPath, 'public');
    }

    /**
     * 检查Vercel CLI是否已安装
     */
    checkVercelCLI() {
        try {
            execSync('vercel --version', { stdio: 'pipe' });
            logSuccess('Vercel CLI 已安装');
            return true;
        } catch (error) {
            logWarning('Vercel CLI 未安装，正在安装...');
            try {
                execSync('npm install -g vercel', { stdio: 'inherit' });
                logSuccess('Vercel CLI 安装成功');
                return true;
            } catch (installError) {
                logError(`Vercel CLI 安装失败: ${installError.message}`);
                return false;
            }
        }
    }

    /**
     * 验证项目文件
     */
    validateProject() {
        const requiredFiles = [
            'package.json',
            'vercel.json',
            'public/index.html',
            'public/styles/main.css',
            'public/scripts/app.js',
            'api/tags.js',
            'api/stocks.js'
        ];

        logStep('🔍', '验证项目文件...');
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectPath, file);
            if (!fs.existsSync(filePath)) {
                logError(`缺少必要文件: ${file}`);
                return false;
            }
        }
        
        logSuccess('所有必要文件都存在');
        return true;
    }

    /**
     * 检查环境变量配置
     */
    checkEnvironmentVariables() {
        logStep('🔧', '检查环境变量配置...');
        
        if (!fs.existsSync('.env.example')) {
            logWarning('未找到 .env.example 文件');
        } else {
            logSuccess('环境变量示例文件存在');
        }
        
        log('\n📝 部署前请确保在 Vercel 中配置以下环境变量:', 'yellow');
        log('   - DATABASE_URL (Neon 数据库连接字符串)', 'yellow');
        log('   - POLYGON_API_KEY (可选)', 'yellow');
        log('   - FINNHUB_API_KEY (可选)', 'yellow');
        log('   - CRON_SECRET (可选)', 'yellow');
    }

    /**
     * 优化文件用于生产环境
     */
    optimizeForProduction() {
        logStep('🚀', '优化生产环境文件...');
        
        // 读取HTML文件并添加生产环境优化
        const htmlPath = path.join(this.publicPath, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 添加性能优化meta标签
        const optimizationMeta = `
    <!-- 生产环境优化 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#667eea">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://fonts.gstatic.com">`;
        
        if (!htmlContent.includes('生产环境优化')) {
            htmlContent = htmlContent.replace('</head>', optimizationMeta + '\n</head>');
            fs.writeFileSync(htmlPath, htmlContent);
            logSuccess('HTML文件已优化');
        }
        
        // 创建robots.txt
        const robotsPath = path.join(this.publicPath, 'robots.txt');
        if (!fs.existsSync(robotsPath)) {
            const robotsContent = `User-agent: *
Allow: /

Sitemap: https://${this.projectName}.vercel.app/sitemap.xml`;
            fs.writeFileSync(robotsPath, robotsContent);
            logSuccess('robots.txt 已创建');
        }
    }

    /**
     * 构建项目
     */
    buildProject() {
        logStep('🔨', '构建项目...');
        
        try {
            // 检查是否有构建脚本
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            if (packageJson.scripts && packageJson.scripts.build) {
                execSync('npm run build', { stdio: 'inherit' });
                logSuccess('项目构建完成');
            } else {
                logWarning('未找到构建脚本，跳过构建步骤');
            }
        } catch (error) {
            logError(`构建失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 执行部署
     */
    async deploy() {
        logStep('🚀', '开始部署到 Vercel...');
        
        try {
            // 登录检查
            try {
                execSync('vercel whoami', { stdio: 'pipe' });
                logSuccess('已登录 Vercel');
            } catch (error) {
                log('🔐 需要登录 Vercel...', 'blue');
                execSync('vercel login', { stdio: 'inherit' });
            }
            
            // 部署项目
            log('📦 正在部署项目...', 'blue');
            const deployOutput = execSync('vercel --prod --yes', { 
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            // 提取部署URL
            const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
            const deployUrl = urlMatch ? urlMatch[0] : null;
            
            if (deployUrl) {
                log('\n🎉 部署成功!', 'green');
                log(`🌐 访问地址: ${deployUrl}`, 'cyan');
                log(`📊 项目仪表板: https://vercel.com/dashboard`, 'cyan');
                
                // 保存部署信息
                const deployInfo = {
                    url: deployUrl,
                    deployedAt: new Date().toISOString(),
                    version: '1.0.0',
                    environment: 'production'
                };
                
                fs.writeFileSync(
                    path.join(this.projectPath, 'deployment.json'),
                    JSON.stringify(deployInfo, null, 2)
                );
                
                return deployUrl;
            } else {
                throw new Error('无法获取部署URL');
            }
            
        } catch (error) {
            logError(`部署失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 部署后检查
     */
    postDeploymentCheck() {
        logStep('🔍', '部署后检查...');
        
        log('\n🎉 部署成功完成！', 'green');
        log('\n📋 部署后检查清单:', 'cyan');
        log('   □ 访问部署的网站确认页面正常加载', 'yellow');
        log('   □ 测试标签点击和股票筛选功能', 'yellow');
        log('   □ 检查 API 接口是否正常响应', 'yellow');
        log('   □ 验证数据库连接是否正常', 'yellow');
        log('   □ 检查控制台是否有错误信息', 'yellow');
        
        log('\n🔗 有用的链接:', 'cyan');
        log('   - Vercel 仪表板: https://vercel.com/dashboard', 'blue');
        log('   - 项目日志: vercel logs', 'blue');
        log('   - 环境变量: vercel env ls', 'blue');
    }

    /**
     * 主执行函数
     */
    async run() {
        log('\n🚀 Stock-Tag-Explorer Vercel 部署脚本', 'bright');
        log('='.repeat(50), 'cyan');
        
        try {
            // 检查环境
            if (!this.checkVercelCLI()) {
                process.exit(1);
            }
            
            // 验证项目
            if (!this.validateProject()) {
                process.exit(1);
            }
            
            // 检查环境变量
            this.checkEnvironmentVariables();
            
            // 优化文件
            this.optimizeForProduction();
            
            // 构建项目
            this.buildProject();
            
            // 执行部署
            const deployUrl = await this.deploy();
            
            // 部署后检查
            this.postDeploymentCheck();
            
            log('\n✨ 部署完成！', 'green');
            log('📝 接下来你可以:', 'cyan');
            log(`   • 访问应用: ${deployUrl}`, 'blue');
            log('   • 查看分析: https://vercel.com/analytics', 'blue');
            log('   • 配置域名: https://vercel.com/domains', 'blue');
            
        } catch (error) {
            logError(`\n💥 部署过程中出现错误: ${error.message}`);
            process.exit(1);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const deployer = new VercelDeployer();
    deployer.run();
}

module.exports = VercelDeployer;