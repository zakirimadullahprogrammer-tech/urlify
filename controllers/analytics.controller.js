const { pool } = require("../config/db");
const { toISODate } = require("../utils/date");

async function getAnalytics(req, res) {
 try {
    const userId = req.user.id;
    const allowedRanges = ["7", "30", "90", "all"];
    const range = allowedRanges.includes(String(req.query.range))
      ? String(req.query.range)
      : "30";

    let daysBack = 30;

    if (range === "7") daysBack = 7;
    if (range === "30") daysBack = 30;
    if (range === "90") daysBack = 90;

    const result = await pool.query(
      `
      WITH user_clicks AS (
        SELECT ca.*
        FROM click_analytics ca
        JOIN urls u ON ca.url_id = u.id
        WHERE u.user_id = $1
      ),
      total AS (
        SELECT COUNT(*)::INT AS total_clicks
        FROM user_clicks
      ),
      unique_visitors AS (
        SELECT COUNT(
          DISTINCT CONCAT(
            COALESCE(ip_address, ''),
            '|',
            COALESCE(user_agent, '')
          )
        )::INT AS unique_visitors
        FROM user_clicks
      ),
      weekly_clicks AS (
        SELECT
          COUNT(*) FILTER (
            WHERE clicked_at >= NOW() - INTERVAL '7 days'
          )::INT AS this_week,
          COUNT(*) FILTER (
            WHERE clicked_at >= NOW() - INTERVAL '14 days'
            AND clicked_at < NOW() - INTERVAL '7 days'
          )::INT AS last_week
        FROM user_clicks
      ),
      top_device AS (
        SELECT COALESCE(device_type, 'Unknown') AS device_type, COUNT(*)::INT AS clicks
        FROM user_clicks
        GROUP BY COALESCE(device_type, 'Unknown')
        ORDER BY clicks DESC
        LIMIT 1
      ),
      top_country AS (
        SELECT COALESCE(country, 'Unknown') AS country, COUNT(*)::INT AS clicks
        FROM user_clicks
        GROUP BY COALESCE(country, 'Unknown')
        ORDER BY clicks DESC
        LIMIT 1
      ),
      avg_redirect AS (
        SELECT ROUND(AVG(redirect_time_ms), 2) AS avg_redirect_time
        FROM user_clicks
      )
      SELECT
        COALESCE((SELECT total_clicks FROM total), 0) AS total_clicks,
        COALESCE((SELECT unique_visitors FROM unique_visitors), 0) AS unique_visitors,
        COALESCE((SELECT this_week FROM weekly_clicks), 0) AS this_week,
        COALESCE((SELECT last_week FROM weekly_clicks), 0) AS last_week,
        (SELECT device_type FROM top_device) AS top_device,
        COALESCE((SELECT clicks FROM top_device), 0) AS top_device_clicks,
        (SELECT country FROM top_country) AS top_country,
        COALESCE((SELECT clicks FROM top_country), 0) AS top_country_clicks,
        COALESCE((SELECT avg_redirect_time FROM avg_redirect), 0) AS avg_redirect_time;
      `,
      [userId]
    );

    const breakdowns = await pool.query(
      `
      WITH user_clicks AS (
        SELECT ca.*
        FROM click_analytics ca
        JOIN urls u ON ca.url_id = u.id
        WHERE u.user_id = $1
      ),
      total AS (
        SELECT COUNT(*)::NUMERIC AS total_clicks
        FROM user_clicks
      )

      SELECT
        'regions' AS type,
        COALESCE(country, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM user_clicks
      GROUP BY COALESCE(country, 'Unknown')

      UNION ALL

      SELECT
        'traffic_sources' AS type,
        COALESCE(traffic_source, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM user_clicks
      GROUP BY COALESCE(traffic_source, 'Unknown')

      UNION ALL

      SELECT
        'browsers' AS type,
        COALESCE(browser, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM user_clicks
      GROUP BY COALESCE(browser, 'Unknown')

      UNION ALL

      SELECT
        'devices' AS type,
        COALESCE(device_type, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM user_clicks
      GROUP BY COALESCE(device_type, 'Unknown')

      UNION ALL

      SELECT
        'operating_systems' AS type,
        COALESCE(operating_system, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM user_clicks
      GROUP BY COALESCE(operating_system, 'Unknown')

      ORDER BY type, clicks DESC;
      `,
      [userId]
    );

    let granularity = "daily";
    let clickAnalyticsResult;

    if (range === "all") {
      clickAnalyticsResult = await pool.query(
        `
        WITH first_click AS (
          SELECT MIN(ca.clicked_at)::date AS first_day
          FROM click_analytics ca
          JOIN urls u ON ca.url_id = u.id
          WHERE u.user_id = $1
        ),
        dates AS (
          SELECT generate_series(
            LEAST(
              COALESCE((SELECT first_day FROM first_click), CURRENT_DATE),
              CURRENT_DATE - INTERVAL '6 days'
            ),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        user_clicks AS (
          SELECT ca.clicked_at::date AS clicked_day
          FROM click_analytics ca
          JOIN urls u ON ca.url_id = u.id
          WHERE u.user_id = $1
        )
        SELECT
          dates.day,
          COUNT(user_clicks.clicked_day)::INT AS clicks
        FROM dates
        LEFT JOIN user_clicks
          ON dates.day = user_clicks.clicked_day
        GROUP BY dates.day
        ORDER BY dates.day;
        `,
        [userId]
      );
    } else {
      clickAnalyticsResult = await pool.query(
        `
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - (($2::INT - 1) * INTERVAL '1 day'),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        user_clicks AS (
          SELECT ca.clicked_at::date AS clicked_day
          FROM click_analytics ca
          JOIN urls u ON ca.url_id = u.id
          WHERE u.user_id = $1
            AND ca.clicked_at::date >= CURRENT_DATE - (($2::INT - 1) * INTERVAL '1 day')
            AND ca.clicked_at::date <= CURRENT_DATE
        )
        SELECT
          dates.day,
          COUNT(user_clicks.clicked_day)::INT AS clicks
        FROM dates
        LEFT JOIN user_clicks
          ON dates.day = user_clicks.clicked_day
        GROUP BY dates.day
        ORDER BY dates.day;
        `,
        [userId, daysBack]
      );
    }

    const topLinksResult = await pool.query(
      `
      SELECT
        u.id,
        u.short_code,
        u.original_url,
        COALESCE(u.total_clicks, 0)::INT AS total_clicks,
        COUNT(ca.id)::INT AS analytics_clicks
      FROM urls u
      LEFT JOIN click_analytics ca ON ca.url_id = u.id
      WHERE u.user_id = $1
      GROUP BY u.id
      ORDER BY total_clicks DESC, analytics_clicks DESC
      LIMIT 5;
      `,
      [userId]
    );

    const recentActivityResult = await pool.query(
      `
      SELECT
        ca.clicked_at,
        COALESCE(ca.country, 'Unknown') AS country,
        COALESCE(ca.device_type, 'Unknown') AS device_type,
        COALESCE(ca.browser, 'Unknown') AS browser,
        COALESCE(ca.operating_system, 'Unknown') AS operating_system,
        COALESCE(ca.traffic_source, 'Unknown') AS traffic_source,
        COALESCE(ca.redirect_time_ms, 0) AS redirect_time_ms,
        u.short_code,
        u.original_url
      FROM click_analytics ca
      JOIN urls u ON ca.url_id = u.id
      WHERE u.user_id = $1
      ORDER BY ca.clicked_at DESC
      LIMIT 30;
      `,
      [userId]
    );

    const summary = result.rows[0];

    const totalClicks = Number(summary.total_clicks || 0);
    const uniqueVisitors = Number(summary.unique_visitors || 0);
    const thisWeek = Number(summary.this_week || 0);
    const lastWeek = Number(summary.last_week || 0);

    let weeklyGrowth = 0;

    if (lastWeek > 0) {
      weeklyGrowth = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    } else if (thisWeek > 0) {
      weeklyGrowth = 100;
    }

    const uniqueVisitorPercentage = totalClicks
      ? Math.round((uniqueVisitors / totalClicks) * 100)
      : 0;

    const topDevicePercentage = totalClicks
      ? Math.round((Number(summary.top_device_clicks || 0) / totalClicks) * 100)
      : 0;

    const topRegionPercentage = totalClicks
      ? Math.round((Number(summary.top_country_clicks || 0) / totalClicks) * 100)
      : 0;

    const avgRedirectTime = Number(summary.avg_redirect_time || 0);

    function getBreakdown(type, keyName) {
      return breakdowns.rows
        .filter(row => row.type === type)
        .map(row => ({
          [keyName]: row.label || "Unknown",
          clicks: Number(row.clicks || 0),
          percentage: Number(row.percentage || 0)
        }));
    }

    const topRegions = getBreakdown("regions", "country").slice(0, 5);
    const trafficSources = getBreakdown("traffic_sources", "source");
    const browsers = getBreakdown("browsers", "browser");
    const devices = getBreakdown("devices", "device");
    const operatingSystems = getBreakdown("operating_systems", "operatingSystem");

    const clickAnalytics = clickAnalyticsResult.rows.map(row => ({
      day: row.day,
      clicks: Number(row.clicks || 0)
    }));

    const topLinks = topLinksResult.rows.map(row => ({
      id: row.id,
      shortCode: row.short_code,
      shortUrl: `${req.protocol}://${req.get("host")}/${row.short_code}`,
      originalUrl: row.original_url,
      totalClicks: Number(row.total_clicks || 0),
      analyticsClicks: Number(row.analytics_clicks || 0)
    }));

    const recentActivity = recentActivityResult.rows.map(row => ({
      clickedAt: toISODate(row.clicked_at),
      country: row.country,
      device: row.device_type,
      browser: row.browser,
      operatingSystem: row.operating_system,
      trafficSource: row.traffic_source,
      redirectTimeMs: Number(row.redirect_time_ms || 0),
      shortCode: row.short_code,
      shortUrl: `${req.protocol}://${req.get("host")}/${row.short_code}`,
      originalUrl: row.original_url
    }));

    return res.status(200).json({
      success: true,
      range,
      granularity,

      cards: {
        totalClicks: {
          title: "Total Clicks",
          value: totalClicks,
          subtitle: `${weeklyGrowth >= 0 ? "+" : ""}${weeklyGrowth}% this week`
        },
        uniqueVisitors: {
          title: "Unique Visitors",
          value: totalClicks > 0 ? uniqueVisitors : "No data",
          subtitle:
            totalClicks === 0
              ? "No visitor analytics"
              : `${uniqueVisitorPercentage}% unique engagement`
        },
        topDevice: {
          title: "Top Device",
          value: totalClicks > 0 ? summary.top_device : "No data",
          subtitle: `${topDevicePercentage}% of traffic`
        },
        topRegion: {
          title: "Top Region",
          country: totalClicks > 0 ? summary.top_country : "XX",
          subtitle: `${topRegionPercentage}% engagement`
        },
        avgRedirectTime: {
          title: "Avg Redirect Time",
          value: totalClicks > 0 ? `${avgRedirectTime}ms` : "No data",
          subtitle:
            totalClicks === 0
              ? "No redirect analytics"
              : avgRedirectTime <= 80
                ? "Excellent performance"
                : avgRedirectTime <= 150
                  ? "Fast response"
                  : avgRedirectTime <= 300
                    ? "Stable performance"
                    : "Optimization opportunity"
        }
      },

      topRegions,
      trafficSources,
      browsers,
      devices,
      operatingSystems,
      topLinks,
      recentActivity,
      clickAnalytics
    });

  } catch (error) {
    console.error("Analytics API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching analytics"
    });
  }
}

async function getLinkAnalytics(req, res) {
   try {
    const userId = req.user.id;
    const linkId = req.params.linkId;

    const allowedRanges = ["7", "30", "90", "all"];
    const range = allowedRanges.includes(String(req.query.range))
      ? String(req.query.range)
      : "30";

    let daysBack = 30;

    if (range === "7") daysBack = 7;
    if (range === "30") daysBack = 30;
    if (range === "90") daysBack = 90;

    const linkResult = await pool.query(
      `
      SELECT
        id,
        original_url,
        short_code,
        total_clicks,
        created_at,
        expires_at,
        is_active
      FROM urls
      WHERE id = $1
      AND user_id = $2
      LIMIT 1
      `,
      [linkId, userId]
    );

    if (linkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link not found"
      });
    }

    const link = linkResult.rows[0];

    const summaryResult = await pool.query(
      `
      WITH link_clicks AS (
        SELECT *
        FROM click_analytics
        WHERE url_id = $1
      ),
      total AS (
        SELECT COUNT(*)::INT AS total_clicks
        FROM link_clicks
      ),
      unique_visitors AS (
        SELECT COUNT(
          DISTINCT CONCAT(
            COALESCE(ip_address, ''),
            '|',
            COALESCE(user_agent, '')
          )
        )::INT AS unique_visitors
        FROM link_clicks
      ),
      weekly_clicks AS (
        SELECT
          COUNT(*) FILTER (
            WHERE clicked_at >= NOW() - INTERVAL '7 days'
          )::INT AS this_week,
          COUNT(*) FILTER (
            WHERE clicked_at >= NOW() - INTERVAL '14 days'
            AND clicked_at < NOW() - INTERVAL '7 days'
          )::INT AS last_week
        FROM link_clicks
      ),
      top_device AS (
        SELECT
          COALESCE(device_type, 'Unknown') AS device_type,
          COUNT(*)::INT AS clicks
        FROM link_clicks
        GROUP BY COALESCE(device_type, 'Unknown')
        ORDER BY clicks DESC
        LIMIT 1
      ),
      top_country AS (
        SELECT
          COALESCE(country, 'Unknown') AS country,
          COUNT(*)::INT AS clicks
        FROM link_clicks
        GROUP BY COALESCE(country, 'Unknown')
        ORDER BY clicks DESC
        LIMIT 1
      ),
      avg_redirect AS (
        SELECT ROUND(AVG(redirect_time_ms), 2) AS avg_redirect_time
        FROM link_clicks
      )
      SELECT
        COALESCE((SELECT total_clicks FROM total), 0) AS total_clicks,
        COALESCE((SELECT unique_visitors FROM unique_visitors), 0) AS unique_visitors,
        COALESCE((SELECT this_week FROM weekly_clicks), 0) AS this_week,
        COALESCE((SELECT last_week FROM weekly_clicks), 0) AS last_week,
        (SELECT device_type FROM top_device) AS top_device,
        COALESCE((SELECT clicks FROM top_device), 0) AS top_device_clicks,
        (SELECT country FROM top_country) AS top_country,
        COALESCE((SELECT clicks FROM top_country), 0) AS top_country_clicks,
        COALESCE((SELECT avg_redirect_time FROM avg_redirect), 0) AS avg_redirect_time;
      `,
      [linkId]
    );

    const breakdowns = await pool.query(
      `
      WITH link_clicks AS (
        SELECT *
        FROM click_analytics
        WHERE url_id = $1
      ),
      total AS (
        SELECT COUNT(*)::NUMERIC AS total_clicks
        FROM link_clicks
      )

      SELECT
        'regions' AS type,
        COALESCE(country, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM link_clicks
      GROUP BY COALESCE(country, 'Unknown')

      UNION ALL

      SELECT
        'traffic_sources' AS type,
        COALESCE(traffic_source, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM link_clicks
      GROUP BY COALESCE(traffic_source, 'Unknown')

      UNION ALL

      SELECT
        'browsers' AS type,
        COALESCE(browser, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM link_clicks
      GROUP BY COALESCE(browser, 'Unknown')

      UNION ALL

      SELECT
        'devices' AS type,
        COALESCE(device_type, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM link_clicks
      GROUP BY COALESCE(device_type, 'Unknown')

      UNION ALL

      SELECT
        'operating_systems' AS type,
        COALESCE(operating_system, 'Unknown') AS label,
        COUNT(*)::INT AS clicks,
        COALESCE(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total_clicks FROM total), 0), 2), 0) AS percentage
      FROM link_clicks
      GROUP BY COALESCE(operating_system, 'Unknown')

      ORDER BY type, clicks DESC;
      `,
      [linkId]
    );

    let clickAnalyticsResult;

    if (range === "all") {
      clickAnalyticsResult = await pool.query(
        `
        WITH first_click AS (
          SELECT MIN(clicked_at)::date AS first_day
          FROM click_analytics
          WHERE url_id = $1
        ),
        dates AS (
          SELECT generate_series(
            LEAST(
              COALESCE((SELECT first_day FROM first_click), CURRENT_DATE),
              CURRENT_DATE - INTERVAL '6 days'
            ),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        link_clicks AS (
          SELECT clicked_at::date AS clicked_day
          FROM click_analytics
          WHERE url_id = $1
        )
        SELECT
          dates.day,
          COUNT(link_clicks.clicked_day)::INT AS clicks
        FROM dates
        LEFT JOIN link_clicks
          ON dates.day = link_clicks.clicked_day
        GROUP BY dates.day
        ORDER BY dates.day;
        `,
        [linkId]
      );
    } else {
      clickAnalyticsResult = await pool.query(
        `
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - (($2::INT - 1) * INTERVAL '1 day'),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        link_clicks AS (
          SELECT clicked_at::date AS clicked_day
          FROM click_analytics
          WHERE url_id = $1
          AND clicked_at::date >= CURRENT_DATE - (($2::INT - 1) * INTERVAL '1 day')
          AND clicked_at::date <= CURRENT_DATE
        )
        SELECT
          dates.day,
          COUNT(link_clicks.clicked_day)::INT AS clicks
        FROM dates
        LEFT JOIN link_clicks
          ON dates.day = link_clicks.clicked_day
        GROUP BY dates.day
        ORDER BY dates.day;
        `,
        [linkId, daysBack]
      );
    }

    const recentActivityResult = await pool.query(
      `
      SELECT
        clicked_at,
        COALESCE(country, 'Unknown') AS country,
        COALESCE(device_type, 'Unknown') AS device_type,
        COALESCE(browser, 'Unknown') AS browser,
        COALESCE(operating_system, 'Unknown') AS operating_system,
        COALESCE(traffic_source, 'Unknown') AS traffic_source,
        COALESCE(redirect_time_ms, 0) AS redirect_time_ms
      FROM click_analytics
      WHERE url_id = $1
      ORDER BY clicked_at DESC
      LIMIT 30;
      `,
      [linkId]
    );

    const summary = summaryResult.rows[0];

    const totalClicks = Number(summary.total_clicks || 0);
    const uniqueVisitors = Number(summary.unique_visitors || 0);
    const thisWeek = Number(summary.this_week || 0);
    const lastWeek = Number(summary.last_week || 0);

    let weeklyGrowth = 0;

    if (lastWeek > 0) {
      weeklyGrowth = Math.round(
        ((thisWeek - lastWeek) / lastWeek) * 100
      );
    } else if (thisWeek > 0) {
      weeklyGrowth = 100;
    }

    const uniqueVisitorPercentage =
      totalClicks
        ? Math.round((uniqueVisitors / totalClicks) * 100)
        : 0;

    const topDevicePercentage =
      totalClicks
        ? Math.round(
            (Number(summary.top_device_clicks || 0) / totalClicks) * 100
          )
        : 0;

    const topRegionPercentage =
      totalClicks
        ? Math.round(
            (Number(summary.top_country_clicks || 0) / totalClicks) * 100
          )
        : 0;

    const avgRedirectTime =
      Number(summary.avg_redirect_time || 0);

    function getBreakdown(type, keyName) {
      return breakdowns.rows
        .filter(row => row.type === type)
        .map(row => ({
          [keyName]: row.label || "Unknown",
          clicks: Number(row.clicks || 0),
          percentage: Number(row.percentage || 0)
        }));
    }

    return res.status(200).json({
      success: true,
      range,

      link: {
        id: link.id,
        shortCode: link.short_code,
        shortUrl: `${req.protocol}://${req.get("host")}/${link.short_code}`,
        originalUrl: link.original_url,
        totalClicks: Number(link.total_clicks || 0),
        createdAt: toISODate(link.created_at),
        expiresAt: link.expires_at
          ? toISODate(link.expires_at)
          : null,
        isActive: link.is_active
      },

      cards: {
        totalClicks: {
          title: "Total Clicks",
          value: totalClicks,
          subtitle: `${weeklyGrowth >= 0 ? "+" : ""}${weeklyGrowth}% this week`
        },

        uniqueVisitors: {
          title: "Unique Visitors",
          value: totalClicks > 0 ? uniqueVisitors : "No data",
          subtitle:
            totalClicks === 0
              ? "No visitor analytics"
              : `${uniqueVisitorPercentage}% unique engagement`
        },

        topDevice: {
          title: "Top Device",
          value: totalClicks > 0 ? summary.top_device : "No data",
          subtitle: `${topDevicePercentage}% of traffic`
        },

        topRegion: {
          title: "Top Region",
          country: totalClicks > 0 ? summary.top_country : "XX",
          subtitle: `${topRegionPercentage}% engagement`
        },

        avgRedirectTime: {
          title: "Avg Redirect Time",
          value:
            totalClicks > 0
              ? `${avgRedirectTime}ms`
              : "No data",
          subtitle:
            totalClicks === 0
              ? "No redirect analytics"
              : avgRedirectTime <= 80
                ? "Excellent performance"
                : avgRedirectTime <= 150
                  ? "Fast response"
                  : avgRedirectTime <= 300
                    ? "Stable performance"
                    : "Optimization opportunity"
        }
      },

      topRegions:
        getBreakdown("regions", "country").slice(0, 5),

      trafficSources:
        getBreakdown("traffic_sources", "source"),

      browsers:
        getBreakdown("browsers", "browser"),

      devices:
        getBreakdown("devices", "device"),

      operatingSystems:
        getBreakdown("operating_systems", "operatingSystem"),

      clickAnalytics: clickAnalyticsResult.rows.map(row => ({
        day: toISODate(row.day),
        clicks: Number(row.clicks || 0)
      })),

      recentActivity: recentActivityResult.rows.map(row => ({
        clickedAt: toISODate(row.clicked_at),
        country: row.country,
        device: row.device_type,
        browser: row.browser,
        operatingSystem: row.operating_system,
        trafficSource: row.traffic_source,
        redirectTimeMs: Number(row.redirect_time_ms || 0),
        shortCode: link.short_code,
        shortUrl: `${req.protocol}://${req.get("host")}/${link.short_code}`,
        originalUrl: link.original_url
      }))
    });

  } catch (error) {
    console.error("Single Link Analytics API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching link analytics"
    });
  }
}

module.exports = {
  getAnalytics,
  getLinkAnalytics
};