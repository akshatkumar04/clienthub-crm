/** Error carrying an HTTP status; the central error middleware turns it into JSON. */
class ApiError extends Error {
  constructor(statusCode, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

module.exports = ApiError;
