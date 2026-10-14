/** Every successful response uses the same envelope: { success, data, message }. */
const sendSuccess = (res, data = null, message = 'OK', statusCode = 200) =>
  res.status(statusCode).json({ success: true, data, message });

module.exports = { sendSuccess };
