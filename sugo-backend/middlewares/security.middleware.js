const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

/**
 * @function applySecurityMiddleware
 * @description Applies security-related middleware to enhance the protection of the application.
 * @param {Object} app - The Express application instance.
 */

exports.securityMiddleware = (app) => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin:
        process.env.ALLOWED_ORIGINS === "*"
          ? true
          : process.env.ALLOWED_ORIGINS.split(","),
      credentials: true,
    })
  );

  app.use(hpp());

  app.use(
    mongoSanitize({
      onSanitize: ({ key }) => {
        console.warn(`Sanitized key: ${key}`);
      },
      replaceWith: "_",
    })
  );

  app.use(xss());
};
