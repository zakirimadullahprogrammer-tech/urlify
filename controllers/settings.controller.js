const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function getSettings(req, res) {
   try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `
      SELECT id, fullname, username
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    let settingsResult = await pool.query(
      `
      SELECT *
      FROM user_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    if (settingsResult.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        `,
        [userId]
      );

      settingsResult = await pool.query(
        `
        SELECT *
        FROM user_settings
        WHERE user_id = $1
        `,
        [userId]
      );
    }

    const settings = settingsResult.rows[0];

    return res.json({
      success: true,
      user: userResult.rows[0],
      preferences: {
        defaultExpiry: settings.default_expiry,
        liveNotifications: settings.live_notifications,
        analyticsAutoRefresh: settings.analytics_auto_refresh
      }
    });

  } catch (error) {
    console.error("Settings Fetch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings"
    });
  }
  
}

async function updateAccount(req, res) {
  try {
    const userId = req.user.id;

    const {
      fullname,
      username
    } = req.body;

    if (!fullname || !username) {
      return res.status(400).json({
        success: false,
        message: "Full name and username are required"
      });
    }

    const usernameCheck =
      await pool.query(
        `
        SELECT id
        FROM users
        WHERE username = $1
        AND id <> $2
        `,
        [username, userId]
      );

    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already taken"
      });
    }

    const updated =
      await pool.query(
        `
        UPDATE users
        SET fullname = $1,
            username = $2
        WHERE id = $3
        RETURNING id, fullname, username
        `,
        [fullname, username, userId]
      );

    return res.json({
      success: true,
      message: "Account updated successfully",
      user: updated.rows[0]
    });

  } catch (error) {
    console.error("Account Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update account"
    });
  }
}

async function updatePassword(req, res) {
  try {
      const userId = req.user.id;
  
      const {
        currentPassword,
        newPassword
      } = req.body;
  
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Both passwords are required"
        });
      }
  
      const userResult =
        await pool.query(
          `
          SELECT password
          FROM users
          WHERE id = $1
          `,
          [userId]
        );
  
      const user =
        userResult.rows[0];
  
      const passwordMatches =
        await bcrypt.compare(
          currentPassword,
          user.password
        );
  
      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }
  
      const hashedPassword =
        await bcrypt.hash(newPassword, 10);
  
      await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        `,
        [hashedPassword, userId]
      );
  
      return res.json({
        success: true,
        message: "Password updated successfully"
      });
  
    } catch (error) {
      console.error("Password Update Error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Failed to update password"
      });
    }
}

async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;

    const {
      defaultExpiry,
      liveNotifications,
      analyticsAutoRefresh
    } = req.body;

    await pool.query(
      `
      INSERT INTO user_settings (
        user_id,
        default_expiry,
        live_notifications,
        analytics_auto_refresh
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        default_expiry = EXCLUDED.default_expiry,
        live_notifications = EXCLUDED.live_notifications,
        analytics_auto_refresh = EXCLUDED.analytics_auto_refresh,
        updated_at = NOW()
      `,
      [
        userId,
        defaultExpiry || "never",
        Boolean(liveNotifications),
        Boolean(analyticsAutoRefresh)
      ]
    );

    return res.json({
      success: true,
      message: "Preferences updated successfully"
    });

  } catch (error) {
    console.error("Preferences Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update preferences"
    });
  }
}

async function deleteAccount(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const {
      password,
      confirmText
    } = req.body || {};

    if (confirmText !== "DELETE") {
      return res.status(400).json({
        message:
          "Please type DELETE to confirm account deletion"
      });
    }

    if (!password) {
      return res.status(400).json({
        message:
          "Password is required"
      });
    }

    const userResult =
      await client.query(
        `
        SELECT password
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

    if (
      userResult.rowCount === 0
    ) {
      return res.status(404)
        .json({
          message:
            "User not found"
        });
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        userResult.rows[0]
          .password
      );

    if (!isPasswordValid) {
      return res.status(401)
        .json({
          message:
            "Invalid password"
        });
    }

    await client.query(
      "BEGIN"
    );

    await client.query(
      `
      DELETE FROM click_analytics
      WHERE url_id IN (
        SELECT id
        FROM urls
        WHERE user_id = $1
      )
      `,
      [userId]
    );

    await client.query(
      `
      DELETE FROM urls
      WHERE user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
      DELETE FROM users
      WHERE id = $1
      `,
      [userId]
    );

    await client.query(
      "COMMIT"
    );

    res.clearCookie(
      "token",
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env
            .NODE_ENV ===
          "production"
      }
    );

    return res.status(200)
      .json({
        success: true,
        message:
          "Account deleted successfully"
      });

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Delete account error:",
      error
    );

    return res.status(500)
      .json({
        success: false,
        message:
          "Failed to delete account"
      });

  } finally {
    client.release();
  }
}

async function exportLinks(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        short_code,
        original_url,
        total_clicks,
        is_active,
        expires_at,
        created_at,
        updated_at
      FROM urls
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const rows = result.rows;

    const csvHeader =
      "short_code,original_url,total_clicks,status,expires_at,created_at,updated_at\n";

    const csvRows = rows.map(row => {
      let status = "Active";

      if (
        row.expires_at &&
        new Date(row.expires_at) <= new Date()
      ) {
        status = "Expired";
      } else if (!row.is_active) {
        status = "Inactive";
      }

      return [
        row.short_code,
        `"${String(row.original_url).replace(/"/g, '""')}"`,
        row.total_clicks,
        status,
        row.expires_at || "",
        row.created_at,
        row.updated_at
      ].join(",");
    });

    const csv =
      csvHeader + csvRows.join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=urlify-links.csv"
    );

    return res.send(csv);

  } catch (error) {
    console.error("Export Links Error:", error);

    return res.status(500).send(
      "Failed to export links"
    );
  }
}

async function exportAnalytics(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        u.short_code,
        ca.clicked_at,
        ca.ip_address,
        ca.device_type,
        ca.browser,
        ca.operating_system,
        ca.country,
        ca.referer,
        ca.traffic_source,
        ca.redirect_time_ms
      FROM click_analytics ca
      JOIN urls u
        ON ca.url_id = u.id
      WHERE u.user_id = $1
      ORDER BY ca.clicked_at DESC
      `,
      [userId]
    );

    const csvHeader =
      "short_code,clicked_at,ip_address,device_type,browser,operating_system,country,referer,traffic_source,redirect_time_ms\n";

    const csvRows = result.rows.map(row => {
      return [
        row.short_code,
        row.clicked_at,
        row.ip_address || "",
        row.device_type || "",
        row.browser || "",
        row.operating_system || "",
        row.country || "",
        `"${String(row.referer || "").replace(/"/g, '""')}"`,
        row.traffic_source || "",
        row.redirect_time_ms || ""
      ].join(",");
    });

    const csv =
      csvHeader + csvRows.join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=urlify-analytics.csv"
    );

    return res.send(csv);

  } catch (error) {
    console.error("Export Analytics Error:", error);

    return res.status(500).send(
      "Failed to export analytics"
    );
  }
}

module.exports = {
  getSettings,
  updateAccount,
  updatePassword,
  updatePreferences,
  deleteAccount,
  exportLinks,
  exportAnalytics
};