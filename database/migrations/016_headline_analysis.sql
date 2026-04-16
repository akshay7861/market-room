-- Migration 016: Add headline_analysis_json to decision_event_log
--
-- Stores the HeadlineAnalysis object alongside each routing decision.
-- The JSON shape mirrors a future sql table (flat, snake_case keys) so this
-- column can be promoted into a dedicated structured table without refactoring:
--   headline_id, agent_id, headline_title, headline_type,
--   direct_relevance_score, indirect_relevance_score, market_signal_strength,
--   is_new_information, is_cross_asset_relevant, primary_mechanism,
--   affected_assets_json, what_changed, linked_existing_thesis_id,
--   recommended_action, comment_purpose, historical_analog_candidate

ALTER TABLE decision_event_log ADD COLUMN headline_analysis_json TEXT;
