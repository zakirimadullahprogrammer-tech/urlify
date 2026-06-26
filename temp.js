app.get("/:shortCode", redirectLimiter, async (req, res) => {
  const startTime = Date.now();
  const clickedAt = new Date();

  try {
    const { shortCode } = req.params;

    if (shortCode === "api") {
      return res.status(404).send("Not found");
    }

    let url = null;

    const cachedUrl =
      await redisClient.get(
        getCacheKey(shortCode)
      );

    if (cachedUrl) {
      url =
        typeof cachedUrl === "string"
          ? JSON.parse(cachedUrl)
          : cachedUrl;
    } else {

      const result = await pool.query(
        `
        SELECT
          id,
          original_url,
          is_active,
          expires_at
        FROM urls
        WHERE short_code = $1
        `,
        [shortCode]
      );

      // Link deleted / invalid
      if (result.rows.length === 0) {
        return res.status(404).send(`
          <html>
            <head>
              <title>Link Unavailable</title>

              <style>
                body{
                  margin:0;
                  height:100vh;
                  display:flex;
                  justify-content:center;
                  align-items:center;
                  background:#0f172a;
                  color:white;
                  font-family:Arial,sans-serif;
                  text-align:center;
                }

                .card{
                  padding:40px;
                  border-radius:20px;
                  background:rgba(255,255,255,0.06);
                  backdrop-filter:blur(10px);
                  max-width:500px;
                }

                h1{
                  margin-bottom:10px;
                }

                p{
                  opacity:.8;
                }
              </style>
            </head>

            <body>
              <div class="card">
                <h1>
                  This link was deleted
                </h1>

                <p>
                  The short link you tried
                  to access is no longer
                  available or may have
                  been removed.
                </p>
              </div>
            </body>
          </html>
        `);
      }

      url = result.rows[0];

      await cacheUrl(shortCode, url);
    }

    if (!url.is_active) {
      await redisClient.del(
        getCacheKey(shortCode)
      );

      return res.status(410).send(
        "This link is inactive"
      );
    }

    if (
      url.expires_at &&
      new Date(url.expires_at) < clickedAt
    ) {
      await redisClient.del(
        getCacheKey(shortCode)
      );

      return res.status(410).send(
        "This link has expired"
      );
    }

    await recordClick(
      url,
      req,
      startTime,
      clickedAt
    );

    return res.redirect(
      url.original_url
    );

  } catch (error) {
    console.error(
      "Redirect error:",
      error
    );

    return res.status(500).send(
      "Server error"
    );
  }
});