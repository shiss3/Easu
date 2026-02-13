# Performance Analyzer

基于AST代码分析和依赖图分析的前端性能优化工具。

## 功能特性

### AST代码分析
- ✅ TypeScript/TSX代码解析
- ✅ 性能反模式检测
- ✅ 组件复杂度分析
- ✅ 代码结构分析

### 依赖图分析
- ✅ 组件依赖图构建
- ✅ 关键路径识别
- ✅ 渲染路径分析
- ✅ 优化机会识别

### 性能优化建议
- ✅ 基于AST分析的优化建议
- ✅ 基于依赖图的优化策略
- ✅ 多维度优化方案

## 安装

```bash
pnpm add @repo/performance-analyzer
```

## 使用示例

```typescript
import { PerformanceAnalyzer } from '@repo/performance-analyzer';

const analyzer = new PerformanceAnalyzer({
  tsConfigPath: './tsconfig.json',
  projectRoot: './apps/client-user'
});

// 分析单个文件
const result = analyzer.analyzeFile('src/page/search-result/index.tsx');

// 构建依赖图
const graph = analyzer.buildDependencyGraph([
  'src/page/search-result/index.tsx',
  'src/components/HotelCard.tsx'
]);

// 生成优化策略
const strategies = analyzer.generateStrategies(result, graph);
```

## API文档

### PerformanceAnalyzer

#### analyzeFile(filePath: string): AnalysisResult
分析单个文件，返回AST分析结果。

#### buildDependencyGraph(filePaths: string[]): DependencyGraph
构建文件间的依赖图。

#### generateStrategies(analysis: AnalysisResult, graph: DependencyGraph): OptimizationStrategy[]
基于分析结果生成优化策略。

## 技术栈

- TypeScript Compiler API
- Graphology (图算法)
- TypeScript 5.9+

## 开发计划

- [x] AST代码分析引擎
- [x] 依赖图分析引擎
- [ ] 多目标优化算法
- [ ] 性能预算系统
