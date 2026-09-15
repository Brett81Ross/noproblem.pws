const analyze = require('./analyze');
const { hasAdminSession } = require('./_auth');

module.exports = async function secureAnalyze(req, res) {
  const isAdmin = hasAdminSession(req);
  req.body = req.body || {};

  if (!isAdmin) {
    req.body.settings = {};
  }

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (!isAdmin && payload?.rawMatrixData?.services && Array.isArray(payload.rawMatrixData.services)) {
      payload = {
        ...payload,
        rawMatrixData: {
          ...payload.rawMatrixData,
          services: payload.rawMatrixData.services.map((service) => {
            const safeService = { ...service };
            delete safeService.calculatedPrice;
            return safeService;
          }),
        },
      };
    }
    return originalJson(payload);
  };

  return analyze(req, res);
};
