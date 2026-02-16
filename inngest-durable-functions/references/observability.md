# Observability and Extended Traces

Comprehensive guide to monitoring, tracing, and observing Inngest functions with OpenTelemetry integration.

## Extended Traces Setup

### Basic Extended Traces Configuration
```typescript
// IMPORTANT: Import and run extendedTracesMiddleware() FIRST
import { extendedTracesMiddleware } from "inngest/experimental";
const extendedTraces = extendedTracesMiddleware();

// Then import everything else
import { Inngest } from "inngest";

const inngest = new Inngest({
  id: "my-app",
  middleware: [extendedTraces],
});
```

### Advanced Extended Traces Configuration
```typescript
import { extendedTracesMiddleware } from "inngest/experimental";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const extendedTraces = extendedTracesMiddleware({
  // Provider behavior options
  behaviour: "auto", // "auto" | "extendProvider" | "createProvider" | "off"
  
  // Custom instrumentations
  instrumentations: [
    new PrismaInstrumentation(),
    // Add other custom instrumentations
  ]
});

export const inngest = new Inngest({
  id: "my-app",
  middleware: [extendedTraces],
});
```

### Integration with Existing Providers (Sentry Example)
```typescript
import * as Sentry from "@sentry/node";
import { extendedTracesMiddleware } from "inngest/experimental";

// Initialize Sentry first
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

// Extended traces will extend Sentry's provider
const extendedTraces = extendedTracesMiddleware({
  behaviour: "auto" // Will extend Sentry's existing provider
});

export const inngest = new Inngest({
  id: "my-app", 
  middleware: [extendedTraces],
});
```

### Manual Provider Integration
```typescript
import { Inngest } from "inngest";
import { extendedTracesMiddleware, InngestSpanProcessor } from "inngest/experimental";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { NodeSDK } from "@opentelemetry/auto-instrumentations-node";

// Create client with disabled auto-instrumentation
export const inngest = new Inngest({
  id: "my-app",
  middleware: [
    extendedTracesMiddleware({
      behaviour: "off" // Don't auto-instrument
    })
  ],
});

// Manually create and configure provider
const provider = new BasicTracerProvider({
  spanProcessors: [
    new InngestSpanProcessor(inngest) // Add Inngest span processor
  ],
});

// Register the provider
provider.register();

// Initialize Node SDK with custom provider
const sdk = new NodeSDK({
  traceExporter: yourTraceExporter,
});

sdk.start();
```

## Automatic Instrumentation Coverage

Extended traces automatically instruments these libraries when creating a new provider:

### Network and HTTP
- `http` and `https` (Node.js built-in)
- `undici` (Node.js global fetch API)
- `@grpc/grpc-js`

### Databases
- `mongodb`
- `mongoose` 
- `pg` (PostgreSQL)
- `mysql` and `mysql2`
- `redis` and `ioredis`
- `cassandra-driver`
- `knex`

### Web Frameworks
- `express`
- `koa`
- `@hapi/hapi`
- `restify`
- `connect`
- `@nestjs/core`

### Message Queues
- `amqplib`
- `kafkajs`

### Cloud Services
- `@aws-sdk/client-*` (AWS SDK v3)

### Logging
- `winston`
- `pino`
- `bunyan`

### Other
- `dns` and `net` (Node.js built-in)
- `fs` (Node.js built-in)
- `dataloader`
- `generic-pool`
- `memcached`
- `socket.io`

## Logging Best Practices

### Logger Configuration with Extended Traces
```typescript
import winston from "winston";
import { extendedTracesMiddleware } from "inngest/experimental";

// Configure Winston with JSON format for structured logging
const logger = winston.createLogger({
  level: "info",
  exitOnError: false,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ],
});

// Enable extended traces
const extendedTraces = extendedTracesMiddleware();

export const inngest = new Inngest({
  id: "my-app",
  logger, // Pass logger to client
  middleware: [extendedTraces],
});
```

### Function Logging Patterns
```typescript
const observableFunction = inngest.createFunction(
  { id: "observable-function" },
  { event: "process/observable" },
  async ({ event, step, logger, runId }) => {
    // Logger automatically includes function metadata when using .child()
    logger.info("Function started", {
      eventData: event.data,
      runId,
      startTime: Date.now()
    });

    const userData = await step.run("fetch-user-data", async () => {
      logger.info("Fetching user data", { 
        userId: event.data.userId 
      });
      
      const data = await userService.getUser(event.data.userId);
      
      logger.info("User data fetched", {
        userId: data.id,
        userType: data.type,
        dataSize: JSON.stringify(data).length
      });
      
      return data;
    });

    const result = await step.run("process-data", async () => {
      const startTime = Date.now();
      
      try {
        const processed = await dataProcessor.process(userData);
        
        logger.info("Data processing completed", {
          processingTime: Date.now() - startTime,
          resultSize: processed.length
        });
        
        return processed;
        
      } catch (error) {
        logger.error("Data processing failed", {
          processingTime: Date.now() - startTime,
          error: error.message,
          userId: userData.id
        });
        throw error;
      }
    });

    logger.info("Function completed successfully", {
      totalExecutionTime: Date.now() - event.ts,
      stepsExecuted: 2,
      resultCount: result.length
    });

    return result;
  }
);
```

### Structured Logging with Correlation IDs
```typescript
const correlatedLogging = inngest.createFunction(
  { id: "correlated-logging" },
  { event: "process/correlated" },
  async ({ event, step, logger, runId }) => {
    // Create correlation context
    const correlationId = event.data.correlationId || runId;
    const baseContext = {
      correlationId,
      userId: event.data.userId,
      requestId: event.data.requestId,
      runId
    };

    logger.info("Starting correlated process", baseContext);

    const step1Result = await step.run("external-api-call", async () => {
      logger.info("Calling external API", {
        ...baseContext,
        step: "external-api-call",
        endpoint: "/api/user-data"
      });

      try {
        const response = await externalAPI.getUserData(event.data.userId, {
          headers: { 'X-Correlation-ID': correlationId }
        });

        logger.info("External API call successful", {
          ...baseContext,
          step: "external-api-call",
          responseStatus: response.status,
          responseTime: response.responseTime
        });

        return response.data;

      } catch (error) {
        logger.error("External API call failed", {
          ...baseContext,
          step: "external-api-call", 
          error: error.message,
          statusCode: error.status
        });
        throw error;
      }
    });

    await step.run("database-operation", async () => {
      logger.info("Performing database operation", {
        ...baseContext,
        step: "database-operation",
        operation: "upsert"
      });

      const result = await database.users.upsert({
        id: event.data.userId,
        data: step1Result,
        correlationId // Include in database record
      });

      logger.info("Database operation completed", {
        ...baseContext,
        step: "database-operation",
        recordId: result.id,
        operation: "upsert"
      });

      return result;
    });
  }
);
```

## Performance Monitoring

### Function Performance Metrics
```typescript
const performanceMonitoring = inngest.createFunction(
  { id: "performance-monitoring" },
  { event: "process/monitored" },
  async ({ event, step, logger }) => {
    const functionStartTime = Date.now();
    const metrics = {
      functionId: "performance-monitoring",
      eventName: event.name,
      startTime: functionStartTime
    };

    // Monitor individual step performance
    const step1Result = await step.run("cpu-intensive-task", async () => {
      const stepStartTime = Date.now();
      
      const result = await cpuIntensiveTask(event.data);
      
      const stepDuration = Date.now() - stepStartTime;
      
      // Log step metrics
      logger.info("Step performance", {
        step: "cpu-intensive-task",
        duration: stepDuration,
        inputSize: JSON.stringify(event.data).length,
        outputSize: JSON.stringify(result).length
      });

      // Send metrics to monitoring service
      await metricsService.recordStepDuration({
        functionId: metrics.functionId,
        stepId: "cpu-intensive-task",
        duration: stepDuration,
        success: true
      });

      return result;
    });

    const step2Result = await step.run("io-intensive-task", async () => {
      const stepStartTime = Date.now();
      
      try {
        const result = await ioIntensiveTask(step1Result);
        
        const stepDuration = Date.now() - stepStartTime;
        
        logger.info("IO task completed", {
          step: "io-intensive-task", 
          duration: stepDuration,
          ioOperations: result.operationCount
        });

        await metricsService.recordStepDuration({
          functionId: metrics.functionId,
          stepId: "io-intensive-task",
          duration: stepDuration,
          success: true,
          ioOperations: result.operationCount
        });

        return result;

      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        
        await metricsService.recordStepDuration({
          functionId: metrics.functionId,
          stepId: "io-intensive-task", 
          duration: stepDuration,
          success: false,
          error: error.message
        });

        throw error;
      }
    });

    // Record overall function performance
    const totalDuration = Date.now() - functionStartTime;
    
    logger.info("Function performance summary", {
      functionId: metrics.functionId,
      totalDuration,
      stepsExecuted: 2,
      avgStepDuration: totalDuration / 2
    });

    await metricsService.recordFunctionDuration({
      functionId: metrics.functionId,
      duration: totalDuration,
      success: true,
      stepCount: 2
    });

    return { step1Result, step2Result };
  }
);
```

### Custom Metrics and Traces
```typescript
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

const customTracing = inngest.createFunction(
  { id: "custom-tracing" },
  { event: "process/traced" },
  async ({ event, step }) => {
    const tracer = trace.getTracer("my-app");

    const result = await step.run("traced-operation", async () => {
      // Create custom span
      return tracer.startActiveSpan("business-logic-operation", async (span) => {
        try {
          // Add custom attributes
          span.setAttributes({
            "user.id": event.data.userId,
            "operation.type": "data-processing",
            "input.size": JSON.stringify(event.data).length
          });

          // Simulate some work with nested spans
          const processedData = await tracer.startActiveSpan("data-transformation", async (childSpan) => {
            childSpan.setAttributes({
              "transformation.type": "normalize"
            });

            const result = await transformData(event.data);
            
            childSpan.setAttributes({
              "transformation.output_records": result.length
            });
            
            childSpan.setStatus({ code: SpanStatusCode.OK });
            childSpan.end();
            
            return result;
          });

          // Another nested operation
          const savedData = await tracer.startActiveSpan("data-persistence", async (childSpan) => {
            childSpan.setAttributes({
              "db.operation": "bulk_insert",
              "db.table": "processed_data"
            });

            const saveResult = await database.bulkInsert(processedData);
            
            childSpan.setAttributes({
              "db.records_inserted": saveResult.insertedCount
            });
            
            childSpan.setStatus({ code: SpanStatusCode.OK });
            childSpan.end();
            
            return saveResult;
          });

          // Add result attributes to main span
          span.setAttributes({
            "result.records_processed": processedData.length,
            "result.records_saved": savedData.insertedCount
          });

          span.setStatus({ code: SpanStatusCode.OK });
          
          return savedData;

        } catch (error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          throw error;
        } finally {
          span.end();
        }
      });
    });

    return result;
  }
);
```

## External Service Integration

### Datadog Integration
```typescript
import winston from "winston";

const datadogLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.Http({
      host: "http-intake.logs.datadoghq.com",
      path: `/api/v2/logs?dd-api-key=${process.env.DD_API_KEY}&ddsource=inngest&service=my-app&ddtags=env:${process.env.NODE_ENV}`,
      ssl: true
    })
  ]
});

export const inngest = new Inngest({
  id: "my-app",
  logger: datadogLogger,
  middleware: [extendedTracesMiddleware()]
});
```

### New Relic Integration
```typescript
import newrelic from "newrelic";
import { extendedTracesMiddleware } from "inngest/experimental";

// Extended traces will extend New Relic's provider
const extendedTraces = extendedTracesMiddleware({
  behaviour: "extendProvider"
});

export const inngest = new Inngest({
  id: "my-app",
  middleware: [extendedTraces]
});

// Custom New Relic metrics in functions
const newRelicMetrics = inngest.createFunction(
  { id: "new-relic-metrics" },
  { event: "process/metrics" },
  async ({ event, step }) => {
    await step.run("tracked-operation", async () => {
      // Track custom metrics
      newrelic.recordMetric('Custom/ProcessingTime', Date.now());
      newrelic.incrementMetric('Custom/ProcessedEvents');
      
      // Add custom attributes
      newrelic.addCustomAttributes({
        'eventType': event.name,
        'userId': event.data.userId,
        'processingNode': process.env.NODE_NAME
      });

      const result = await processEvent(event.data);
      
      newrelic.recordMetric('Custom/ProcessedRecords', result.recordCount);
      
      return result;
    });
  }
);
```

### Prometheus/Grafana Integration
```typescript
import promClient from "prom-client";

// Create custom metrics
const functionDuration = new promClient.Histogram({
  name: 'inngest_function_duration_seconds',
  help: 'Duration of Inngest function execution',
  labelNames: ['function_id', 'event_name', 'status']
});

const stepDuration = new promClient.Histogram({
  name: 'inngest_step_duration_seconds',
  help: 'Duration of individual step execution',
  labelNames: ['function_id', 'step_id', 'status']
});

const prometheusMetrics = inngest.createFunction(
  { id: "prometheus-metrics" },
  { event: "process/prometheus" },
  async ({ event, step }) => {
    const functionTimer = functionDuration.startTimer({
      function_id: "prometheus-metrics",
      event_name: event.name
    });

    try {
      const result = await step.run("measured-operation", async () => {
        const stepTimer = stepDuration.startTimer({
          function_id: "prometheus-metrics", 
          step_id: "measured-operation"
        });

        try {
          const result = await performOperation(event.data);
          stepTimer({ status: 'success' });
          return result;
        } catch (error) {
          stepTimer({ status: 'error' });
          throw error;
        }
      });

      functionTimer({ status: 'success' });
      return result;

    } catch (error) {
      functionTimer({ status: 'error' });
      throw error;
    }
  }
);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

## Observability Best Practices

### Key Metrics to Track
- **Function execution time**: Total duration from trigger to completion
- **Step execution time**: Individual step performance
- **Retry rates**: Which steps/functions fail most often
- **Queue depth**: How many functions are waiting to execute
- **Error rates**: Function and step failure percentages
- **Throughput**: Functions processed per minute/hour

### Alerting Strategies
```typescript
const alertingFunction = inngest.createFunction(
  { id: "alerting-example" },
  { event: "process/alerting" },
  async ({ event, step, logger }) => {
    const alertThresholds = {
      maxDuration: 300000, // 5 minutes
      maxRetries: 3,
      errorThreshold: 0.1 // 10% error rate
    };

    const startTime = Date.now();
    
    try {
      const result = await step.run("monitored-operation", async () => {
        const result = await riskyOperation(event.data);
        
        // Check if operation took too long
        const duration = Date.now() - startTime;
        if (duration > alertThresholds.maxDuration) {
          await alertingService.send({
            level: 'warning',
            message: `Function exceeded duration threshold`,
            duration,
            threshold: alertThresholds.maxDuration,
            functionId: 'alerting-example'
          });
        }
        
        return result;
      });

    } catch (error) {
      // Alert on step failures
      await step.run("send-error-alert", async () => {
        await alertingService.send({
          level: 'error',
          message: `Function step failed: ${error.message}`,
          functionId: 'alerting-example',
          stepId: 'monitored-operation',
          error: error.message,
          eventData: event.data
        });
      });
      
      throw error;
    }
  }
);
```

### Health Check Functions
```typescript
const healthCheck = inngest.createFunction(
  { id: "health-check" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step, logger }) => {
    const healthStatus = {
      timestamp: Date.now(),
      services: {}
    };

    // Check database connectivity
    healthStatus.services.database = await step.run("check-database", async () => {
      try {
        const result = await database.query('SELECT 1');
        return { status: 'healthy', responseTime: Date.now() - startTime };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    // Check external API connectivity
    healthStatus.services.externalAPI = await step.run("check-external-api", async () => {
      try {
        const startTime = Date.now();
        const response = await externalAPI.healthCheck();
        return { 
          status: 'healthy', 
          responseTime: Date.now() - startTime,
          apiStatus: response.status 
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    // Send health status to monitoring
    await step.run("report-health-status", async () => {
      const overallHealth = Object.values(healthStatus.services)
        .every(service => service.status === 'healthy') ? 'healthy' : 'degraded';

      await monitoringService.reportHealth({
        ...healthStatus,
        overallStatus: overallHealth
      });

      if (overallHealth === 'degraded') {
        await alertingService.send({
          level: 'warning',
          message: 'System health check detected issues',
          healthStatus
        });
      }
    });

    return healthStatus;
  }
);
```

## Debugging and Troubleshooting

### Debug Logging Configuration
```typescript
const debugFunction = inngest.createFunction(
  { id: "debug-function" },
  { event: "debug/test" },
  async ({ event, step, logger }) => {
    // Enable debug logging conditionally
    const isDebugMode = event.data.debug || process.env.NODE_ENV === 'development';
    
    if (isDebugMode) {
      logger.debug("Debug mode enabled", {
        eventData: event.data,
        environment: process.env.NODE_ENV
      });
    }

    const result = await step.run("debug-operation", async () => {
      if (isDebugMode) {
        logger.debug("Starting debug operation", {
          input: event.data,
          timestamp: Date.now()
        });
      }

      try {
        const result = await someOperation(event.data);
        
        if (isDebugMode) {
          logger.debug("Operation completed", {
            result: result,
            executionTime: Date.now() - startTime
          });
        }
        
        return result;

      } catch (error) {
        logger.error("Operation failed", {
          error: error.message,
          stack: isDebugMode ? error.stack : undefined,
          input: event.data
        });
        throw error;
      }
    });

    return result;
  }
);
```

This comprehensive observability setup ensures you have full visibility into your Inngest functions' performance, errors, and behavior across all environments.