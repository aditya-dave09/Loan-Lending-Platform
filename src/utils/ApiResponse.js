/**
 * Standard API response wrapper.
 * Ensures all API responses have a consistent shape.
 *
 * Usage:
 *   res.status(200).json(new ApiResponse(200, data, 'Success'));
 *   res.status(201).json(ApiResponse.created(data, 'Loan created'));
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
  }

  static ok(data, message = 'Success') {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static paginated(data, meta, message = 'Success') {
    return new ApiResponse(200, data, message, meta);
  }

  static noContent(message = 'Deleted successfully') {
    return new ApiResponse(204, null, message);
  }
}

module.exports = ApiResponse;
