const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const redisClient = require("../config/redis");

const {
  generateShortCode
} = require(
  "../utils/base62"
);

const {
  toISODate
} = require(
  "../utils/date"
);

const {
  getBaseUrl
} = require(
  "../utils/url"
);

const {
  getCacheKey,
  cacheUrl
} = require(
  "../services/cache.service"
);

async function getLinks(req, res) {
  const BASE_URL = getBaseUrl(req);

  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = req.user.id;
const username = req.user.username;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.original_url,
        u.short_code,
        u.total_clicks,
        u.created_at,

        CASE
          WHEN u.is_active = FALSE THEN 'Inactive'
          WHEN u.expires_at IS NOT NULL AND u.expires_at < NOW() THEN 'Expired'
          ELSE 'Active'
        END AS status,

        MAX(c.clicked_at) AS last_click

      FROM urls u
      LEFT JOIN click_analytics c
        ON u.id = c.url_id

      WHERE u.user_id = $1

      GROUP BY
        u.id,
        u.original_url,
        u.short_code,
        u.total_clicks,
        u.created_at,
        u.is_active,
        u.expires_at

      ORDER BY u.created_at DESC;
      `,
      [userId]
    );

    const links = result.rows.map(link => ({
      id: link.id,
      shortLink: `${BASE_URL}/${link.short_code}`,
      originalUrl: link.original_url,
      clicks: link.total_clicks,
      status: link.status,
      created: toISODate(link.created_at),
lastClick: link.last_click
  ? toISODate(link.last_click)
  : "Never"
    }));

    res.status(200).json({
      success: true,
      username,
      count: links.length,
      links
    });

  } catch (error) {
    console.error("Error fetching links:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching links"
    });
  }
}

async function createLink(req, res) {
  try {
    const token = req.cookies.token;
    const BASE_URL = getBaseUrl(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const userId = decoded.id;

    const {
      originalUrl,
      customAlias,
      expiry
    } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: "Original URL is required"
      });
    }

    if (!/^https?:\/\/.+/i.test(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: "URL must start with http:// or https://"
      });
    }

    let expiresAt = null;

    if (expiry === "1day") {
      expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    } else if (expiry === "7days") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (expiry === "30days") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (expiry && expiry !== "never") {
      expiresAt = new Date(expiry);

      if (isNaN(expiresAt.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date"
        });
      }
    }

    let shortCode;
    let createdLink;

    if (customAlias && customAlias.trim() !== "") {
      shortCode = customAlias.trim();

      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(shortCode)) {
        return res.status(400).json({
          success: false,
          message: "Custom alias must be 3-30 characters and contain only letters, numbers, _ or -"
        });
      }

      const existing = await pool.query(
        "SELECT id FROM urls WHERE short_code = $1",
        [shortCode]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Custom alias already taken"
        });
      }

      const result = await pool.query(
        `
        INSERT INTO urls (
          user_id,
          original_url,
          short_code,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [userId, originalUrl, shortCode, expiresAt]
      );

      createdLink = result.rows[0];

    } else {
      const result = await pool.query(
        `
        INSERT INTO urls (
          user_id,
          original_url,
          short_code,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [userId, originalUrl, "temp", expiresAt]
      );

      shortCode = generateShortCode(result.rows[0].id);

      const updated = await pool.query(
        `
        UPDATE urls
        SET short_code = $1
        WHERE id = $2
        RETURNING *
        `,
        [shortCode, result.rows[0].id]
      );

      createdLink = updated.rows[0];
    }

    await cacheUrl(createdLink.short_code, {
  id: createdLink.id,
  user_id: createdLink.user_id,
  original_url: createdLink.original_url,
  is_active: createdLink.is_active,
  expires_at: createdLink.expires_at
});

    return res.status(201).json({
      success: true,
      message: "Short link created successfully",
      link: {
        id: createdLink.id,
        originalUrl: createdLink.original_url,
        shortCode: createdLink.short_code,
        shortLink: `${BASE_URL}/${createdLink.short_code}`,
        clicks: createdLink.total_clicks,
        status: "Active",
        created: toISODate(createdLink.created_at),
expiresAt: createdLink.expires_at
  ? toISODate(createdLink.expires_at)
  : null
      }
    });

  } catch (error) {
    console.error("Create Link Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating link"
    });
  }
}

async function updateLink(req, res) {
  try {
    const userId = req.user.id;
    const urlId = req.params.id;

    const {
      originalUrl,
      customAlias,
      expiry,
      customExpiryDate,
      isActive
    } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: "Original URL is required"
      });
    }

    if (!/^https?:\/\/.+/i.test(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: "URL must start with http:// or https://"
      });
    }

    const existingLink = await pool.query(
      `
      SELECT *
      FROM urls
      WHERE id = $1
      AND user_id = $2
      LIMIT 1
      `,
      [urlId, userId]
    );

    if (existingLink.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link not found"
      });
    }

    const oldLink = existingLink.rows[0];

    let shortCode =
      oldLink.short_code;

    if (
      customAlias &&
      customAlias.trim() !== ""
    ) {
      shortCode =
        customAlias.trim();

      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(shortCode)) {
        return res.status(400).json({
          success: false,
          message:
            "Custom alias must be 3-30 characters and contain only letters, numbers, _ or -"
        });
      }

      if (shortCode !== oldLink.short_code) {
        const aliasCheck =
          await pool.query(
            `
            SELECT id
            FROM urls
            WHERE short_code = $1
            AND id <> $2
            LIMIT 1
            `,
            [shortCode, urlId]
          );

        if (aliasCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message:
              "Custom alias already taken"
          });
        }
      }
    }

    let expiresAt = null;

    if (expiry === "never") {
      expiresAt = null;

    } else if (expiry === "1hour") {
      expiresAt =
        new Date(
          Date.now() +
          1 * 60 * 60 * 1000
        );

    } else if (expiry === "12hours") {
      expiresAt =
        new Date(
          Date.now() +
          12 * 60 * 60 * 1000
        );

    } else if (expiry === "1day") {
      expiresAt =
        new Date(
          Date.now() +
          1 * 24 * 60 * 60 * 1000
        );

    } else if (expiry === "7days") {
      expiresAt =
        new Date(
          Date.now() +
          7 * 24 * 60 * 60 * 1000
        );

    } else if (expiry === "30days") {
      expiresAt =
        new Date(
          Date.now() +
          30 * 24 * 60 * 60 * 1000
        );

    } else if (expiry === "90days") {
      expiresAt =
        new Date(
          Date.now() +
          90 * 24 * 60 * 60 * 1000
        );

    } else if (expiry === "custom") {
      if (!customExpiryDate) {
        return res.status(400).json({
          success: false,
          message:
            "Custom expiry date is required"
        });
      }

      expiresAt =
        new Date(customExpiryDate);

      if (isNaN(expiresAt.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid custom expiry date"
        });
      }

      if (expiresAt <= new Date()) {
        return res.status(400).json({
          success: false,
          message:
            "Custom expiry date must be in the future"
        });
      }

    } else {
      expiresAt =
        oldLink.expires_at;
    }

    const finalIsActive =
      typeof isActive === "boolean"
        ? isActive
        : oldLink.is_active;

    const updated =
      await pool.query(
        `
        UPDATE urls
        SET
          original_url = $1,
          short_code = $2,
          expires_at = $3,
          is_active = $4,
          updated_at = NOW()
        WHERE id = $5
        AND user_id = $6
        RETURNING *
        `,
        [
          originalUrl,
          shortCode,
          expiresAt,
          finalIsActive,
          urlId,
          userId
        ]
      );

    const updatedLink =
      updated.rows[0];

    /*
      Important:
      Do NOT cache immediately after edit.
      Only delete stale cache.
      Redirect route will fetch fresh DB row and cache again.
    */
    await redisClient.del(
      getCacheKey(oldLink.short_code)
    );

    await redisClient.del(
      getCacheKey(shortCode)
    );

    let status = "Active";

    if (
      updatedLink.expires_at &&
      new Date(updatedLink.expires_at) <= new Date()
    ) {
      status = "Expired";
    } else if (!updatedLink.is_active) {
      status = "Inactive";
    }

    return res.status(200).json({
      success: true,
      message: "Link updated successfully",
      link: {
        id: updatedLink.id,
        originalUrl:
          updatedLink.original_url,
        shortCode:
          updatedLink.short_code,
        shortLink:
          `${getBaseUrl(req)}/${updatedLink.short_code}`,
        clicks:
          Number(updatedLink.total_clicks || 0),
        status,
        created:
          toISODate(updatedLink.created_at),
        expiresAt:
          updatedLink.expires_at
            ? toISODate(updatedLink.expires_at)
            : null,
        updatedAt:
          toISODate(updatedLink.updated_at)
      }
    });

  } catch (error) {
    console.error(
      "Edit Link Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating link"
    });
  }
}

async function deleteLink(req, res) {
  try {

      const userId =
        req.user.id;

      const urlId =
        req.params.id;

      const result =
        await pool.query(
          `
          DELETE FROM urls
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            urlId,
            userId
          ]
        );

      if (
        result.rows
          .length === 0
      ) {

        return res
          .status(404)
          .json({
            success:
              false,
            message:
              "Link not found"
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,
          message:
            "Link deleted successfully"
        });

    } catch (
      error
    ) {

      console.error(
        "Delete Link Error:",
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,
          message:
            "Server error while deleting link"
        });
    }
}

module.exports = {
  getLinks,
  createLink,
  updateLink,
  deleteLink
};