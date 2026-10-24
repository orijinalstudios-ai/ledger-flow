const { put, get, del, BlobNotFoundError } = require('@vercel/blob');

// Helper to sanitize sync key / workspace name / user id
function sanitizeKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return 'main';
  const clean = rawKey.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return clean.slice(0, 100) || 'main';
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure storage is linked
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      success: false,
      error: 'Vercel Blob storage is not configured. BLOB_READ_WRITE_TOKEN is missing.'
    });
  }

  // Parse key from query or body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const queryKey = req.query && req.query.key;
  const bodyKey = body && body.key;
  const key = sanitizeKey(queryKey || bodyKey);
  const pathname = `ledger_${key}.json`;

  try {
    // 1. GET: Retrieve ledger data from cloud
    if (req.method === 'GET') {
      try {
        const result = await get(pathname, { access: 'private', useCache: false });
        if (result && result.stream) {
          const text = await new Response(result.stream).text();
          const parsed = JSON.parse(text);
          return res.status(200).json({
            success: true,
            exists: true,
            key,
            data: parsed
          });
        }
        return res.status(200).json({
          success: true,
          exists: false,
          key,
          data: null
        });
      } catch (err) {
        if (
          (BlobNotFoundError && err instanceof BlobNotFoundError) ||
          err.name === 'BlobNotFoundError' ||
          (err.message && err.message.toLowerCase().includes('could not find'))
        ) {
          return res.status(200).json({
            success: true,
            exists: false,
            key,
            data: null
          });
        }
        throw err;
      }
    }

    // 2. POST: Save / update ledger in cloud
    if (req.method === 'POST') {
      const payload = body || {};
      if (!Array.isArray(payload.transactions)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload: "transactions" array is required.'
        });
      }

      const recordToStore = {
        key,
        transactions: payload.transactions,
        currency: payload.currency || { code: 'NGN', symbol: '₦', label: 'NGN (₦)' },
        updatedAt: new Date().toISOString()
      };

      await put(pathname, JSON.stringify(recordToStore), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true
      });

      return res.status(200).json({
        success: true,
        key,
        updatedAt: recordToStore.updatedAt,
        recordCount: recordToStore.transactions.length
      });
    }

    // 3. DELETE: Clear cloud records
    if (req.method === 'DELETE') {
      try {
        await del(pathname);
      } catch (e) {
        // ignore if already deleted
      }
      return res.status(200).json({
        success: true,
        message: `Cloud ledger records for key "${key}" deleted.`
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/ledger handler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
};
