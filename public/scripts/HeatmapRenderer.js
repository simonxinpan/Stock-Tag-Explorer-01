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
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
            color: #1a202c;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(8px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            min-width: 180px;
        `;
        document.body.appendChild(this.tooltip);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .heatmap-cell {
                stroke: rgba(255, 255, 255, 0.8);
                stroke-width: 0.5;
                cursor: pointer;
                transition: all 0.3s ease;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
            }
            
            .heatmap-cell:hover {
                stroke-width: 2;
                stroke: rgba(0, 0, 0, 0.6);
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
            }
            
            .heatmap-label {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 11px;
                fill: #fff;
                text-anchor: middle;
                dominant-baseline: central;
                pointer-events: none;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                font-weight: 500;
            }
            
            .heatmap-group {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .heatmap-group:hover {
                transform: scale(1.05);
                z-index: 10;
            }
            
            .stock-heatmap-container {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            
            .heatmap-canvas {
                background: #fff;
                border-radius: 8px;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
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
        
        if (!data || data.length === 0) {
            return [];
        }
        
        // 使用Treemap算法进行更紧凑的布局
        return this.calculateTreemapLayout(data, availableWidth, availableHeight, padding);
    }
    
    calculateTreemapLayout(data, width, height, padding) {
        // 计算总权重（使用市值或交易量作为权重）
        const totalWeight = data.reduce((sum, item) => {
            const weight = item.market_cap || item.volume || item.size || 1;
            return sum + Math.abs(weight);
        }, 0);
        
        if (totalWeight === 0) {
            return this.fallbackGridLayout(data, width, height, padding);
        }
        
        // 为每个项目计算相对面积
        const items = data.map((item, index) => {
            const weight = Math.abs(item.market_cap || item.volume || item.size || 1);
            const area = (weight / totalWeight) * width * height;
            return {
                ...item,
                weight,
                area,
                index
            };
        });
        
        // 按权重排序（大的在前）
        items.sort((a, b) => b.weight - a.weight);
        
        // 递归分割布局
        const layout = [];
        this.squarify(items, [], width, height, padding, padding, layout);
        
        return layout;
    }
    
    squarify(items, row, w, h, x, y, layout) {
        if (items.length === 0) {
            this.layoutRow(row, w, h, x, y, layout);
            return;
        }
        
        if (row.length === 0) {
            row.push(items.shift());
            this.squarify(items, row, w, h, x, y, layout);
            return;
        }
        
        const item = items[0];
        const newRow = [...row, item];
        
        if (this.worst(row, w, h) >= this.worst(newRow, w, h)) {
            row.push(items.shift());
            this.squarify(items, row, w, h, x, y, layout);
        } else {
            const rowArea = row.reduce((sum, item) => sum + item.area, 0);
            const totalArea = w * h;
            
            if (w >= h) {
                const rowWidth = rowArea / h;
                this.layoutRow(row, rowWidth, h, x, y, layout);
                this.squarify(items, [], w - rowWidth, h, x + rowWidth, y, layout);
            } else {
                const rowHeight = rowArea / w;
                this.layoutRow(row, w, rowHeight, x, y, layout);
                this.squarify(items, [], w, h - rowHeight, x, y + rowHeight, layout);
            }
        }
    }
    
    layoutRow(row, w, h, x, y, layout) {
        const totalArea = row.reduce((sum, item) => sum + item.area, 0);
        let currentY = y;
        
        row.forEach(item => {
            const itemHeight = (item.area / totalArea) * h;
            layout.push({
                ...item,
                x: x,
                y: currentY,
                width: w - 2, // 留出边距
                height: itemHeight - 2,
            });
            currentY += itemHeight;
        });
    }
    
    worst(row, w, h) {
        if (row.length === 0) return Infinity;
        
        const totalArea = row.reduce((sum, item) => sum + item.area, 0);
        const minArea = Math.min(...row.map(item => item.area));
        const maxArea = Math.max(...row.map(item => item.area));
        
        const s2 = totalArea * totalArea;
        const r2 = Math.min(w, h) * Math.min(w, h);
        
        return Math.max(
            (s2 * maxArea) / (r2 * minArea * minArea),
            (r2 * minArea * minArea) / (s2 * maxArea)
        );
    }
    
    fallbackGridLayout(data, width, height, padding) {
        const aspectRatio = width / height;
        const cellCount = data.length;
        
        let cols = Math.ceil(Math.sqrt(cellCount * aspectRatio));
        let rows = Math.ceil(cellCount / cols);
        
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        
        return data.map((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            return {
                ...item,
                x: padding + col * cellWidth,
                y: padding + row * cellHeight,
                width: cellWidth - 2,
                height: cellHeight - 2,
                index: index
            };
        });
    }
    
    createScales(data, metric) {
        // 获取数值范围
        const values = data.map(d => this.getValue(d, metric)).filter(v => !isNaN(v));
        
        if (values.length === 0) {
            this.scales.color = () => '#e0e0e0';
            this.scales.size = () => 1;
            return;
        }
        
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
        
        // 现代化颜色映射 - 使用HSL色彩空间实现平滑渐变
        this.scales.color = (value) => {
            if (isNaN(value)) return '#f5f5f5'; // 中性灰
            
            const normalized = Math.max(-1, Math.min(1, value / absMax));
            
            if (Math.abs(normalized) < 0.005) {
                // 接近零值 - 中性色
                return '#e8eaf6';
            }
            
            if (normalized > 0) {
                // 正值 - 绿色渐变 (120° hue)
                const intensity = Math.pow(normalized, 0.7); // 使用幂函数增强对比
                const lightness = Math.max(25, 85 - intensity * 60); // 25% - 85%
                const saturation = Math.min(90, 40 + intensity * 50); // 40% - 90%
                return `hsl(120, ${saturation}%, ${lightness}%)`;
            } else {
                // 负值 - 红色渐变 (0° hue)
                const intensity = Math.pow(Math.abs(normalized), 0.7);
                const lightness = Math.max(25, 85 - intensity * 60); // 25% - 85%
                const saturation = Math.min(90, 40 + intensity * 50); // 40% - 90%
                return `hsl(0, ${saturation}%, ${lightness}%)`;
            }
        };
        
        // 优化大小比例尺
        const sizeValues = data.map(d => d.market_cap || d.volume || d.size || 1);
        const minSize = Math.min(...sizeValues);
        const maxSize = Math.max(...sizeValues);
        
        this.scales.size = (value) => {
            if (isNaN(value) || maxSize === minSize) return 1;
            // 使用对数缩放避免极端差异
            const logMin = Math.log(minSize + 1);
            const logMax = Math.log(maxSize + 1);
            const logValue = Math.log(value + 1);
            return 0.3 + 0.7 * (logValue - logMin) / (logMax - logMin);
        };
    }
    
    renderCells(layout, metric) {
        layout.forEach((item, index) => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'heatmap-group');
            
            // 创建矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const value = this.getValue(item, metric);
            
            // 使用完整的单元格大小，不再缩放
            rect.setAttribute('x', item.x);
            rect.setAttribute('y', item.y);
            rect.setAttribute('width', item.width);
            rect.setAttribute('height', item.height);
            rect.setAttribute('fill', this.scales.color(value));
            rect.setAttribute('class', 'heatmap-cell');
            rect.setAttribute('data-index', index);
            rect.setAttribute('rx', '4'); // 添加圆角
            rect.setAttribute('ry', '4');
            
            group.appendChild(rect);
            
            // 添加标签 - 优化显示逻辑
            if (this.options.showLabels) {
                const minDimension = Math.min(item.width, item.height);
                const centerX = item.x + item.width / 2;
                const centerY = item.y + item.height / 2;
                
                // 根据单元格大小调整标签显示
                if (minDimension > 60) {
                    // 大单元格：显示股票代码和数值
                    const symbolText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    symbolText.setAttribute('x', centerX);
                    symbolText.setAttribute('y', centerY - 8);
                    symbolText.setAttribute('class', 'heatmap-label');
                    symbolText.style.fontSize = '12px';
                    symbolText.style.fontWeight = 'bold';
                    symbolText.textContent = item.symbol || item.name || '';
                    
                    const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    valueText.setAttribute('x', centerX);
                    valueText.setAttribute('y', centerY + 8);
                    valueText.setAttribute('class', 'heatmap-label');
                    valueText.style.fontSize = '10px';
                    valueText.textContent = this.formatValue(value, metric);
                    
                    group.appendChild(symbolText);
                    group.appendChild(valueText);
                } else if (minDimension > 30) {
                    // 中等单元格：只显示股票代码
                    const symbolText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    symbolText.setAttribute('x', centerX);
                    symbolText.setAttribute('y', centerY);
                    symbolText.setAttribute('class', 'heatmap-label');
                    symbolText.style.fontSize = '10px';
                    symbolText.style.fontWeight = 'bold';
                    symbolText.textContent = item.symbol || '';
                    
                    group.appendChild(symbolText);
                }
                // 小单元格：不显示标签，避免拥挤
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
        const changeColor = value >= 0 ? '#10b981' : '#ef4444';
        const changeIcon = value >= 0 ? '↗' : '↘';
        
        this.tooltip.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #111827;">
                ${data.name || data.symbol || '未知股票'}
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <span style="color: ${changeColor}; font-weight: 600; margin-right: 4px;">${changeIcon}</span>
                <span style="color: ${changeColor}; font-weight: 600;">
                    ${this.getMetricDisplayName(this.metric)}: ${this.formatValue(value, this.metric)}
                </span>
            </div>
            ${data.market_cap ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 3px;">💰 市值: ${this.formatMarketCap(data.market_cap)}</div>` : ''}
            ${data.volume ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 3px;">📊 成交量: ${this.formatNumber(data.volume)}</div>` : ''}
            ${data.industry ? `<div style="color: #6b7280; font-size: 12px;">🏢 ${data.industry}</div>` : ''}
        `;
        
        this.updateTooltipPosition(event);
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
            this.tooltip.style.transform = 'translateY(8px)';
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
        if (!value || value === 0) return '未知';
        
        // 输入的value是百万美元，需要转换为亿美元
        // 1亿美元 = 100百万美元
        const cap = parseFloat(value);
        const capInYi = cap / 100; // 转换为亿美元
        
        if (capInYi >= 10000) {
            return `$${(capInYi / 10000).toFixed(1)}万亿`;
        } else if (capInYi >= 100) {
            return `$${capInYi.toFixed(0)}亿`;
        } else if (capInYi >= 10) {
            return `$${capInYi.toFixed(1)}亿`;
        } else {
            return `$${capInYi.toFixed(2)}亿`;
        }
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