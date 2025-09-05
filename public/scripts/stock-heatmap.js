/**
 * 股票热力图组件
 * 用于渲染股票数据的热力图可视化
 */
class StockHeatmap {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            metric: 'change_percent',
            timeRange: '1d',
            category: 'market',
            interactive: true,
            showTooltip: true,
            colorScheme: 'default',
            ...options
        };
        this.data = [];
        this.tooltip = null;
    }

    /**
     * 渲染热力图
     */
    async render(data) {
        this.data = data || [];
        
        if (!this.data.length) {
            this.showEmptyState();
            return;
        }

        // 清空容器
        this.container.innerHTML = '';
        
        // 创建热力图容器
        const heatmapWrapper = document.createElement('div');
        heatmapWrapper.className = 'heatmap-wrapper';
        
        // 创建股票块
        this.data.forEach(stock => {
            const stockBlock = this.createStockBlock(stock);
            heatmapWrapper.appendChild(stockBlock);
        });
        
        this.container.appendChild(heatmapWrapper);
        
        // 创建工具提示
        if (this.options.showTooltip) {
            this.createTooltip();
        }
    }

    /**
     * 创建股票块
     */
    createStockBlock(stock) {
        const block = document.createElement('div');
        block.className = 'stock-block';
        
        // 计算颜色
        const color = this.getColor(stock[this.options.metric]);
        block.style.backgroundColor = color;
        
        // 计算大小（基于市值）
        const size = this.getSize(stock.marketCap);
        block.style.width = `${size}px`;
        block.style.height = `${size}px`;
        
        // 添加内容
        const symbol = document.createElement('div');
        symbol.className = 'stock-symbol';
        symbol.textContent = stock.symbol;
        
        const change = document.createElement('div');
        change.className = 'stock-change';
        const changeValue = stock[this.options.metric];
        change.textContent = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`;
        
        block.appendChild(symbol);
        block.appendChild(change);
        
        // 添加交互事件
        if (this.options.interactive) {
            this.addInteractivity(block, stock);
        }
        
        return block;
    }

    /**
     * 根据变化百分比获取颜色
     */
    getColor(value) {
        if (value > 5) return '#00C851'; // 深绿
        if (value > 2) return '#4CAF50'; // 绿
        if (value > 0) return '#8BC34A'; // 浅绿
        if (value > -2) return '#FFC107'; // 黄
        if (value > -5) return '#FF9800'; // 橙
        return '#F44336'; // 红
    }

    /**
     * 根据市值计算大小
     */
    getSize(marketCap) {
        const minSize = 60;
        const maxSize = 120;
        const minCap = 1000000000; // 10亿
        const maxCap = 3000000000000; // 3万亿
        
        const ratio = Math.log(marketCap - minCap + 1) / Math.log(maxCap - minCap + 1);
        return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
    }

    /**
     * 添加交互功能
     */
    addInteractivity(block, stock) {
        block.addEventListener('mouseenter', (e) => {
            if (this.tooltip) {
                this.showTooltip(e, stock);
            }
            block.style.transform = 'scale(1.05)';
            block.style.zIndex = '10';
        });
        
        block.addEventListener('mouseleave', () => {
            if (this.tooltip) {
                this.hideTooltip();
            }
            block.style.transform = 'scale(1)';
            block.style.zIndex = '1';
        });
        
        block.addEventListener('click', () => {
            this.onStockClick(stock);
        });
    }

    /**
     * 创建工具提示
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'heatmap-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            max-width: 200px;
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * 显示工具提示
     */
    showTooltip(event, stock) {
        if (!this.tooltip) return;
        
        const changeValue = stock[this.options.metric];
        this.tooltip.innerHTML = `
            <div><strong>${stock.symbol}</strong></div>
            <div>${stock.name}</div>
            <div>价格: $${stock.price.toFixed(2)}</div>
            <div>变化: ${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%</div>
            <div>市值: $${(stock.marketCap / 1000000000).toFixed(1)}B</div>
        `;
        
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = event.pageX + 10 + 'px';
        this.tooltip.style.top = event.pageY - 10 + 'px';
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }

    /**
     * 股票点击事件
     */
    onStockClick(stock) {
        console.log('Stock clicked:', stock);
        // 可以触发自定义事件或回调
        if (this.options.onStockClick) {
            this.options.onStockClick(stock);
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.container.innerHTML = `
            <div class="heatmap-empty">
                <div class="empty-icon">📊</div>
                <div class="empty-text">暂无数据</div>
            </div>
        `;
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.container.innerHTML = '';
    }
}

// 添加CSS样式
if (!document.getElementById('heatmap-styles')) {
    const style = document.createElement('style');
    style.id = 'heatmap-styles';
    style.textContent = `
        .heatmap-wrapper {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 10px;
            justify-content: flex-start;
            align-items: flex-start;
        }
        
        .stock-block {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.2s ease;
            position: relative;
            min-width: 60px;
            min-height: 60px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .stock-symbol {
            font-weight: bold;
            font-size: 11px;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            margin-bottom: 2px;
        }
        
        .stock-change {
            font-size: 9px;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        }
        
        .heatmap-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #666;
        }
        
        .empty-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        .empty-text {
            font-size: 16px;
        }
        
        @media (max-width: 768px) {
            .heatmap-wrapper {
                gap: 2px;
                padding: 5px;
            }
            
            .stock-block {
                min-width: 50px;
                min-height: 50px;
            }
            
            .stock-symbol {
                font-size: 10px;
            }
            
            .stock-change {
                font-size: 8px;
            }
        }
    `;
    document.head.appendChild(style);
}