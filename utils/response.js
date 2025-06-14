// utils/response.utils.js

exports.successResponse = (data, message = "Success") => ({
    success: true,
    message,
    data,
  });
  
  exports.errorResponse = (message = "Error", code = 500) => ({
    success: false,
    message,
    error: message,
    code,
  });
  

  exports.getPaginationData = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return {
      currentPage: parseInt(page),
      totalPages,
      totalItems: parseInt(totalItems),
      limit: parseInt(limit),
    };
  };
  