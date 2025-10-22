const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vibe-trading-agent',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    service: 'Vibe Trading AI Agent',
    description: 'AI-powered equity research agent using gemini-cli and MCP servers',
    endpoints: {
      'GET /health': 'Health check',
      'POST /analyze': 'Analyze a stock ticker',
      'GET /docs': 'API documentation'
    },
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'Vibe Trading AI Agent API',
    version: '1.0.0',
    description: 'AI-powered equity research agent API',
    endpoints: {
      'GET /health': {
        description: 'Health check endpoint',
        response: {
          status: 'healthy',
          service: 'vibe-trading-agent',
          timestamp: 'ISO string',
          version: '1.0.0'
        }
      },
      'POST /analyze': {
        description: 'Analyze a stock ticker using AI',
        request: {
          ticker: 'string (required) - Stock ticker symbol (e.g., AAPL, TSLA)',
          options: 'object (optional) - Additional analysis options'
        },
        response: {
          ticker: 'string',
          analysis: 'string - Detailed equity research report',
          status: 'completed',
          timestamp: 'ISO string'
        }
      }
    },
    examples: {
      analyze: {
        request: {
          ticker: 'AAPL',
          options: {
            timeframe: '1y',
            includeCharts: true
          }
        }
      }
    }
  });
});

// Stock analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { ticker, options = {} } = req.body;
    
    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker is required',
        message: 'Please provide a stock ticker symbol (e.g., AAPL, TSLA)'
      });
    }

    // Validate ticker format (basic validation)
    if (!/^[A-Z]{1,5}$/.test(ticker.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid ticker format',
        message: 'Ticker must be 1-5 uppercase letters'
      });
    }

    console.log(`Starting analysis for ticker: ${ticker}`);
    
    // Run gemini-cli analysis
    const analysisResult = await runGeminiAnalysis(ticker, options);
    
    res.json({
      ticker: ticker.toUpperCase(),
      analysis: analysisResult,
      status: 'completed',
      timestamp: new Date().toISOString(),
      options: options
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Function to run gemini-cli analysis
async function runGeminiAnalysis(ticker, options) {
  return new Promise((resolve, reject) => {
    const prompt = `Analyze the stock ticker ${ticker} using the equity research workflow. ${options.timeframe ? `Focus on ${options.timeframe} timeframe.` : ''} ${options.includeCharts ? 'Include technical analysis charts.' : ''}`;
    
    const geminiProcess = spawn('gemini', [
      'run',
      '--prompt', prompt,
      '--config', '.gemini/settings.json'
    ], {
      cwd: '/app',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    geminiProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    geminiProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    geminiProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Gemini CLI failed with code ${code}: ${stderr}`));
      }
    });

    geminiProcess.on('error', (error) => {
      reject(new Error(`Failed to start Gemini CLI: ${error.message}`));
    });

    // Set timeout
    setTimeout(() => {
      geminiProcess.kill();
      reject(new Error('Analysis timeout after 5 minutes'));
    }, 300000); // 5 minutes timeout
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Vibe Trading AI Agent running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`  API Docs: http://localhost:${PORT}/docs`);
  console.log(`  Stock Analysis: http://localhost:${PORT}/analyze`);
  console.log(`📝 Example usage:`);
  console.log(`  curl -X POST http://localhost:${PORT}/analyze \\`);
  console.log(`    -H 'Content-Type: application/json' \\`);
  console.log(`    -d '{"ticker": "AAPL"}'`);
});

module.exports = app;
