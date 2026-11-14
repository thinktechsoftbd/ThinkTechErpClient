# Taste

- Always run (apply) new database migration/schema scripts against the dev database after writing them (e.g. ThinkTechErpData/Sql/034_settings_areas.sql); don't leave them for the user to apply. This supersedes the earlier preference to treat the live DB as read-only and leave migrations to the user. Confidence: 0.9
