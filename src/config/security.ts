// Security Configuration for Production
// This file contains all environment-specific security settings

const ENV = process.env.NODE_ENV || "development";
const isDevelopment = ENV === "development";
const isProduction = ENV === "production";

export const securityConfig = {
  // JWT Configuration
  jwt: {
    expiresIn: isProduction ? "1d" : "7d",
    algorithm: "HS256",
  },

  // Password Security
  password: {
    minLength: isDevelopment ? 6 : 8,
    requireUppercase: !isDevelopment,
    requireLowercase: !isDevelopment,
    requireNumbers: !isDevelopment,
    requireSpecialChars: !isDevelopment,
    bcryptRounds: isProduction ? 12 : 10,
  },

  // Cookie Security
  cookies: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },

  // CORS Configuration
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim()),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowCredentials: true,
  },

  // Rate Limiting
  rateLimit: {
    enabled: isProduction || process.env.RATE_LIMIT_ENABLED === "true",
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    // More restrictive for auth endpoints
    authWindowMs: 15 * 60 * 1000, // 15 minutes
    authMaxRequests: 5,
  },

  // Security Headers
  headers: {
    enabled: process.env.ENABLE_SECURITY_HEADERS !== "false",
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    format: process.env.LOG_FORMAT || "json",
    // In production, never log sensitive data
    logPII: isDevelopment,
    logStackTraces: isDevelopment,
  },

  // Error Handling
  errors: {
    // In production, never expose internal error details
    exposeDetails: isDevelopment,
    includeStackTraces: isDevelopment,
    includeErrorCode: true,
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || "10485760"), // 10MB
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/csv",
      "application/vnd.ms-excel",
    ],
    scanForVirus: isProduction, // Enable antivirus scanning in production
  },

  // Session Configuration
  session: {
    expiresIn: 24 * 60 * 60, // 1 day in seconds
    refreshThreshold: 12 * 60 * 60, // Refresh after 12 hours
  },

  // API Configuration
  api: {
    requestTimeout: isProduction ? 30000 : 60000, // 30s prod, 60s dev
    maxJsonPayloadSize: "10mb",
    maxUrlencodedPayloadSize: "10mb",
  },
};

// Validate required environment variables in production
if (isProduction) {
  const requiredVars = [
    "JWT_SECRET",
    "DATABASE_URL",
    "APP_NAME",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  // Ensure JWT_SECRET is not the default
  if (process.env.JWT_SECRET === "dev-secret") {
    throw new Error(
      "JWT_SECRET must be changed from default 'dev-secret' in production"
    );
  }

  // Ensure NODE_ENV is explicitly set
  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV must be explicitly set to 'production'");
  }
}

export default securityConfig;
