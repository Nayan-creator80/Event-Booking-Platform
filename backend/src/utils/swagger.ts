import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { config } from "../config";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Event Booking Platform API",
      version: "1.0.0",
      description: "Complete REST API documentation for the Event Booking Platform. Sign in or register to get an access token, click the 'Authorize' button, and paste your token in to test authorized routes.",
    },
    servers: [
      {
        url: `/`,
        description: "Default server (relative)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    config.nodeEnv === "production"
      ? "./dist/routes/*.js"
      : "./src/routes/*.ts",
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
export { swaggerSpec };
