// 热力图渲染器 - 负责热力图的可视化渲染

class HeatmapRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            padding: options.padding || 20,
            showLabels: options.showLabels !== false,
            showTooltip: options.showTooltip !== false,
            colorScheme: options.colorScheme || 'default',
            animation: options.animation !== false,
            interactive: options.interactive !== false,
            ...options
        };
        
        this.svg = null;
        this.tooltip = null;
        this.data = [];
        this.scales = {};
        
        this.initializeRenderer();
    }
    
    initializeRenderer() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建SVG元素
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', this.options.width);
        this.svg.setAttribute('height', this.options.height);
        this.svg.style.display = 'block';
        this.container.appendChild(this.svg);
        
        // 创建工具提示
        if (this.options.showTooltip) {
            this.createTooltip();
        }
        
        // 添加样式
        this.addStyles();
    }
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'heatmap-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s;
            max-width: 200px;
            word-wrap: break-word;
        `;
        document.body.appendChild(this.tooltip);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .heatmap-cell {
                stroke: #fff;
                stroke-width: 1;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .heatmap-cell:hover {
                stroke-width: 2;
                stroke: #333;
            }
            
            .heatmap-label {
                font-family: Arial, sans-serif;
                font-size: 11px;
                fill: #333;
                text-anchor: middle;
                dominant-baseline: central;
                pointer-events: none;
            }
            
            .heatmap-group {
                transition: transform 0.2s ease;
            }
            
            .heatmap-group:hover {
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);
    }
    
    render(data, metric = 'change_percent') {
        this.data = data;
        this.metric = metric;
        
        // 清空SVG内容
        this.svg.innerHTML = '';
        
        if (!data || data.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // 计算布局
        const layout = this.calculateLayout(data);
        
        // 创建比例尺
        this.createScales(data, metric);
        
        // 渲染热力图单元格
        this.renderCells(layout, metric);
        
        // 添加动画
        if (this.options.animation) {
            this.animateEntrance();
        }
    }
    
    calculateLayout(data) {
        const { width, height, padding } = this.options;
        const availableWidth = width - 2 * padding;
        const availableHeight = height - 2 * padding;
        
        // 计算网格尺寸
        const aspectRatio = availableWidth / availableHeight;
        const totalArea = availableWidth * availableHeight;
        const cellCount = data.length;
        
        // 计算最佳网格布局
        let cols = Math.ceil(Math.sqrt(cellCount * aspectRatio));
        let rows = Math.ceil(cellCount / cols);
        
        // 调整以更好地利用空间
        while (cols * rows < cellCount) {
            if (cols * availableHeight / rows < availableWidth) {
                cols++;
            } else {
                rows++;
            }
        }
        
        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;
        
        // 为每个数据项计算位置和大小
        return data.map((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            return {
                ...item,
                x: padding + col * cellWidth,
                y: padding + row * cellHeight,
                width: cellWidth - 2, // 留出边距
                height: cellHeight - 2,
                index: index
            };
        });
    }
    
    createScales(data, metric) {
        // 获取数值范围
        const values = data.map(d => this.getValue(d, metric)).filter(v => !isNaN(v));
        
        if (values.length === 0) {
            this.scales.color = () => '#ccc';
            this.scales.size = () => 1;
            return;
        }
        
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
        
        // 颜色比例尺 - 简化为绿红配色方案
        this.scales.color = (value) => {
            if (isNaN(value)) return '#e0e0e0'; // 灰色
            
            const normalized = value / absMax;
            
            // 上涨 - 绿色系
            if (normalized > 0.6) return '#1b5e20'; // 深绿
            if (normalized > 0.3) return '#2e7d32'; // 绿色
            if (normalized > 0.1) return '#4caf50'; // 浅绿
            if (normalized > 0.01) return '#81c784'; // 淡绿
            
            // 平盘 - 灰色
            if (normalized >= -0.01) return '#9e9e9e'; // 灰色
            
            // 下跌 - 红色系
            if (normalized > -0.1) return '#ef5350'; // 淡红
            if (normalized > -0.3) return '#f44336'; // 红色
            if (normalized > -0.6) return '#d32f2f'; // 深红
            return '#b71c1c'; // 极深红
        };
        
        // 大小比例尺（基于市值或成交量）
        const sizeValues = data.map(d => d.market_cap || d.volume || d.size || 1);
        const minSize = Math.min(...sizeValues);
        const maxSize = Math.max(...sizeValues);
        
        this.scales.size = (value) => {
            if (isNaN(value) || maxSize === minSize) return 1;
            return 0.5 + 0.5 * (value - minSize) / (maxSize - minSize);
        };
    }
    
    renderCells(layout, metric) {
        layout.forEach((item, index) => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'heatmap-group');
            
            // 创建矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const value = this.getValue(item, metric);
            const sizeScale = this.scales.size(item.market_cap || item.volume || item.size || 1);
            
            // 计算实际大小
            const actualWidth = item.width * sizeScale;
            const actualHeight = item.height * sizeScale;
            const offsetX = (item.width - actualWidth) / 2;
            const offsetY = (item.height - actualHeight) / 2;
            
            rect.setAttribute('x', item.x + offsetX);
            rect.setAttribute('y', item.y + offsetY);
            rect.setAttribute('width', actualWidth);
            rect.setAttribute('height', actualHeight);
            rect.setAttribute('fill', this.scales.color(value));
            rect.setAttribute('class', 'heatmap-cell');
            rect.setAttribute('data-index', index);
            
            group.appendChild(rect);
            
            // 添加标签
            if (this.options.showLabels && actualWidth > 40 && actualHeight > 20) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', item.x + item.width / 2);
                text.setAttribute('y', item.y + item.height / 2 - 5);
                text.setAttribute('class', 'heatmap-label');
                text.textContent = item.symbol || item.name || '';
                
                const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueText.setAttribute('x', item.x + item.width / 2);
                valueText.setAttribute('y', item.y + item.height / 2 + 8);
                valueText.setAttribute('class', 'heatmap-label');
                valueText.style.fontSize = '10px';
                valueText.textContent = this.formatValue(value, metric);
                
                group.appendChild(text);
                group.appendChild(valueText);
            }
            
            // 添加交互事件
            if (this.options.interactive) {
                this.addInteractivity(group, item, index);
            }
            
            this.svg.appendChild(group);
        });
    }
    
    addInteractivity(element, data, index) {
        // 鼠标悬停事件
        element.addEventListener('mouseenter', (e) => {
            if (this.options.showTooltip) {
                this.showTooltip(e, data);
            }
            
            // 触发自定义事件
            if (this.options.onCellHover) {
                this.options.onCellHover(data, index);
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (this.options.showTooltip) {
                this.hideTooltip();
            }
        });
        
        element.addEventListener('mousemove', (e) => {
            if (this.options.showTooltip && this.tooltip.style.opacity === '1') {
                this.updateTooltipPosition(e);
            }
        });
        
        // 点击事件
        element.addEventListener('click', () => {
            if (this.options.onCellClick) {
                this.options.onCellClick(data, index);
            }
        });
    }
    
    showTooltip(event, data) {
        if (!this.tooltip) return;
        
        const value = this.getValue(data, this.metric);
        
        this.tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">
                ${data.name || data.symbol || '未知'}
            </div>
            <div>${this.getMetricDisplayName(this.metric)}: ${this.formatValue(value, this.metric)}</div>
            ${data.market_cap ? `<div>市值: ${this.formatMarketCap(data.market_cap)}</div>` : ''}
            ${data.volume ? `<div>成交量: ${this.formatNumber(data.volume)}</div>` : ''}
            ${data.industry ? `<div>行业: ${data.industry}</div>` : ''}
        `;
        
        this.updateTooltipPosition(event);
        this.tooltip.style.opacity = '1';
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }
    
    updateTooltipPosition(event) {
        if (!this.tooltip) return;
        
        const rect = this.container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.tooltip.style.left = (event.clientX + 10) + 'px';
        this.tooltip.style.top = (event.clientY - 10) + 'px';
    }
    
    animateEntrance() {
        const cells = this.svg.querySelectorAll('.heatmap-group');
        
        cells.forEach((cell, index) => {
            cell.style.opacity = '0';
            cell.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                cell.style.transition = 'all 0.3s ease';
                cell.style.opacity = '1';
                cell.style.transform = 'scale(1)';
            }, index * 50);
        });
    }
    
    renderEmptyState() {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', this.options.width / 2);
        text.setAttribute('y', this.options.height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.style.fontSize = '16px';
        text.style.fill = '#666';
        text.textContent = '暂无数据';
        
        this.svg.appendChild(text);
    }
    
    getValue(item, metric) {
        switch (metric) {
            case 'change_percent':
                return parseFloat(item.change_percent || item.avgChange || 0);
            case 'volume':
                return parseInt(item.volume || item.totalVolume || 0);
            case 'market_cap':
                return parseInt(item.market_cap || item.totalMarketCap || 0);
            case 'price':
                return parseFloat(item.price || 0);
            default:
                return parseFloat(item[metric] || 0);
        }
    }
    
    formatValue(value, metric) {
        if (isNaN(value)) return '-';
        
        switch (metric) {
            case 'change_percent':
                return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
            case 'volume':
                return this.formatNumber(value);
            case 'market_cap':
                return this.formatMarketCap(value);
            case 'price':
                return `$${value.toFixed(2)}`;
            default:
                return value.toFixed(2);
        }
    }
    
    formatNumber(num) {
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toString();
    }
    
    formatMarketCap(value) {
        if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        return `$${value.toFixed(0)}`;
    }
    
    getMetricDisplayName(metric) {
        const names = {
            'change_percent': '涨跌幅',
            'volume': '成交量',
            'market_cap': '市值',
            'price': '价格'
        };
        return names[metric] || metric;
    }
    
    // 更新数据
    updateData(newData, metric) {
        this.render(newData, metric || this.metric);
    }
    
    // 更新指标
    updateMetric(newMetric) {
        this.render(this.data, newMetric);
    }
    
    // 调整大小
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        
        // 重新渲染
        this.render(this.data, this.metric);
    }
    
    // 导出为图片
    exportAsImage(filename = 'heatmap.png') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        
        const svgData = new XMLSerializer().serializeToString(this.svg);
        const img = new Image();
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
    
    // 销毁渲染器
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeatmapRenderer;
} else {
    window.HeatmapRenderer = HeatmapRenderer;
}