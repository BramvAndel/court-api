const MAX_NESTING_DEPTH = 8;
const DEFAULT_MAX_STRING_LENGTH = 2000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;

const MALICIOUS_PATTERNS = [
  /<\s*script/gi,
  /javascript:/gi,
  /on\w+\s*=\s*/gi,
  /<\s*iframe/gi,
  /('|\")\s*or\s+\d+\s*=\s*\d+/gi,
  /\bunion\s+select\b/gi,
  /\bdrop\s+table\b/gi,
  /\/\*|\*\/|--/g,
];

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const sanitizeString = (value, maxLength = DEFAULT_MAX_STRING_LENGTH) => {
  if (typeof value !== "string") return value;

  return value
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
};

const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_NESTING_DEPTH) return value;

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeValue(val, depth + 1)]),
    );
  }

  return value;
};

const containsMaliciousContent = (value, depth = 0) => {
  if (depth > MAX_NESTING_DEPTH) return false;

  if (typeof value === "string") {
    return MALICIOUS_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(value);
    });
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsMaliciousContent(item, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((val) =>
      containsMaliciousContent(val, depth + 1),
    );
  }

  return false;
};

const buildValidationError = (message, field) => {
  const error = { message };
  if (field) error.field = field;
  return error;
};

const validateField = (value, rules, fieldName) => {
  if (value === undefined || value === null) {
    if (rules.required) {
      return buildValidationError(`${fieldName} is required`, fieldName);
    }
    return null;
  }

  const expectedType = rules.type;
  let normalizedValue = value;

  if (expectedType === "number") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return buildValidationError(`${fieldName} must be a number`, fieldName);
    }
    if (rules.integer && !Number.isInteger(numeric)) {
      return buildValidationError(`${fieldName} must be an integer`, fieldName);
    }
    if (rules.min !== undefined && numeric < rules.min) {
      return buildValidationError(
        `${fieldName} must be at least ${rules.min}`,
        fieldName,
      );
    }
    if (rules.max !== undefined && numeric > rules.max) {
      return buildValidationError(
        `${fieldName} must be at most ${rules.max}`,
        fieldName,
      );
    }
    normalizedValue = numeric;
  }

  if (expectedType === "string") {
    if (typeof value !== "string") {
      return buildValidationError(`${fieldName} must be a string`, fieldName);
    }

    const stringValue = sanitizeString(value, rules.maxLength || DEFAULT_MAX_STRING_LENGTH);

    if (rules.minLength !== undefined && stringValue.length < rules.minLength) {
      return buildValidationError(
        `${fieldName} must be at least ${rules.minLength} characters`,
        fieldName,
      );
    }

    if (rules.maxLength !== undefined && stringValue.length > rules.maxLength) {
      return buildValidationError(
        `${fieldName} must be at most ${rules.maxLength} characters`,
        fieldName,
      );
    }

    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return buildValidationError(`${fieldName} format is invalid`, fieldName);
    }

    normalizedValue = stringValue;
  }

  if (expectedType === "array") {
    if (!Array.isArray(value)) {
      return buildValidationError(`${fieldName} must be an array`, fieldName);
    }
    if (rules.minItems !== undefined && value.length < rules.minItems) {
      return buildValidationError(
        `${fieldName} must contain at least ${rules.minItems} item(s)`,
        fieldName,
      );
    }
    if (rules.maxItems !== undefined && value.length > rules.maxItems) {
      return buildValidationError(
        `${fieldName} must contain at most ${rules.maxItems} item(s)`,
        fieldName,
      );
    }

    if (rules.itemSchema) {
      for (const [index, item] of value.entries()) {
        if (!isPlainObject(item)) {
          return buildValidationError(
            `${fieldName}[${index}] must be an object`,
            fieldName,
          );
        }

        for (const [itemField, itemRules] of Object.entries(rules.itemSchema)) {
          const itemError = validateField(
            item[itemField],
            itemRules,
            `${fieldName}[${index}].${itemField}`,
          );
          if (itemError) return itemError;

          if (item[itemField] !== undefined) {
            item[itemField] = normalizeByRules(item[itemField], itemRules);
          }
        }
      }
    }
  }

  if (rules.enum && !rules.enum.includes(normalizedValue)) {
    return buildValidationError(
      `${fieldName} must be one of: ${rules.enum.join(", ")}`,
      fieldName,
    );
  }

  return null;
};

const normalizeByRules = (value, rules) => {
  if (value === undefined || value === null) return value;

  if (rules.type === "number") return Number(value);
  if (rules.type === "string") {
    return sanitizeString(value, rules.maxLength || DEFAULT_MAX_STRING_LENGTH);
  }

  return value;
};

const validateRequest = (schema = {}) => {
  return (req, res, next) => {
    const errors = [];

    for (const section of ["params", "query", "body"]) {
      const rules = schema[section];
      if (!rules) continue;

      const source = req[section] || {};

      for (const [field, fieldRules] of Object.entries(rules)) {
        const error = validateField(source[field], fieldRules, field);
        if (error) {
          errors.push(error);
          continue;
        }

        if (source[field] !== undefined) {
          source[field] = normalizeByRules(source[field], fieldRules);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};

const validateAndSanitizeInput = (req, res, next) => {
  req.params = sanitizeValue(req.params || {});
  req.query = sanitizeValue(req.query || {});
  req.body = sanitizeValue(req.body || {});

  if (
    containsMaliciousContent(req.params) ||
    containsMaliciousContent(req.query) ||
    containsMaliciousContent(req.body)
  ) {
    return res.status(400).json({
      message: "Request contains unsafe content",
    });
  }

  next();
};

const commonSchemas = {
  idParam: {
    params: {
      id: { type: "number", required: true, integer: true, min: 1 },
    },
  },
  userIdParam: {
    params: {
      userId: { type: "number", required: true, integer: true, min: 1 },
    },
  },
  register: {
    body: {
      email: {
        type: "string",
        required: true,
        maxLength: 255,
        pattern: EMAIL_REGEX,
      },
      password: { type: "string", required: true, minLength: 8, maxLength: 128 },
      username: {
        type: "string",
        required: false,
        minLength: 3,
        maxLength: 30,
        pattern: USERNAME_REGEX,
      },
    },
  },
  login: {
    body: {
      email: {
        type: "string",
        required: true,
        maxLength: 255,
        pattern: EMAIL_REGEX,
      },
      password: { type: "string", required: true, minLength: 8, maxLength: 128 },
    },
  },
  updateUser: {
    body: {
      email: {
        type: "string",
        required: false,
        maxLength: 255,
        pattern: EMAIL_REGEX,
      },
      username: {
        type: "string",
        required: false,
        minLength: 3,
        maxLength: 30,
        pattern: USERNAME_REGEX,
      },
      name: {
        type: "string",
        required: false,
        minLength: 3,
        maxLength: 30,
        pattern: USERNAME_REGEX,
      },
    },
  },
  createGame: {
    body: {
      name: { type: "string", required: false, minLength: 1, maxLength: 100 },
      description: {
        type: "string",
        required: false,
        minLength: 1,
        maxLength: 1000,
      },
      plannedAt: {
        type: "string",
        required: false,
        pattern: ISO_DATE_REGEX,
        maxLength: 35,
      },
      startedAt: {
        type: "string",
        required: false,
        pattern: ISO_DATE_REGEX,
        maxLength: 35,
      },
      endedAt: {
        type: "string",
        required: false,
        pattern: ISO_DATE_REGEX,
        maxLength: 35,
      },
    },
  },
  processGame: {
    body: {
      winnerId: { type: "number", required: true, integer: true, min: 1 },
      scores: {
        type: "array",
        required: true,
        minItems: 1,
        maxItems: 100,
        itemSchema: {
          userId: { type: "number", required: true, integer: true, min: 1 },
          score: { type: "number", required: true, min: 0, max: 100000 },
        },
      },
    },
  },
  usernameParam: {
    params: {
      username: {
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_.\-\s]+$/,
      },
    },
  },
};

module.exports = {
  validateAndSanitizeInput,
  validateRequest,
  commonSchemas,
};
