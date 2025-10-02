
'use strict';

exports.handler = async (event, context) => {
  const module = await import('./admin-health.mjs');
  return module.handler(event, context);
};