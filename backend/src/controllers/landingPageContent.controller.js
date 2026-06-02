/**
 * Landing Page Content Controller
 *
 * Handles CRUD operations for landing page content.
 * Only super admins can modify content.
 */

import LandingPageContent from '../models/LandingPageContent.js';

/**
 * Get all landing page content (public)
 */
export const getPublicContent = async (req, res) => {
  try {
    let content = await LandingPageContent.getActiveContent();

    // If no content exists, initialize defaults
    if (Object.keys(content).length === 0) {
      content = await LandingPageContent.initializeDefaults();
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching landing page content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch landing page content' }
    });
  }
};

/**
 * Get specific section content (public)
 */
export const getSectionContent = async (req, res) => {
  try {
    const { section } = req.params;

    let content = await LandingPageContent.getSectionContent(section);

    if (!content) {
      // Return default content if not found
      const defaults = LandingPageContent.getDefaultContent();
      if (defaults[section]) {
        return res.json({
          success: true,
          data: defaults[section]
        });
      }

      return res.status(404).json({
        success: false,
        error: { message: 'Section not found' }
      });
    }

    res.json({
      success: true,
      data: content.content
    });
  } catch (error) {
    console.error('Error fetching section content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch section content' }
    });
  }
};

/**
 * Get all landing page content (admin)
 */
export const getAllContent = async (req, res) => {
  try {
    const content = await LandingPageContent.find({})
      .populate('lastUpdatedBy', 'firstName lastName email')
      .sort({ section: 1 });

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching all landing page content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch landing page content' }
    });
  }
};

/**
 * Update section content (admin only)
 */
export const updateSectionContent = async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Content is required' }
      });
    }

    const validSections = ['hero', 'features', 'howItWorks', 'testimonials', 'faq', 'stats', 'cta'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid section' }
      });
    }

    const updated = await LandingPageContent.updateSectionContent(section, content, userId);

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating section content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update section content' }
    });
  }
};

/**
 * Reset section to default content (admin only)
 */
export const resetSectionContent = async (req, res) => {
  try {
    const { section } = req.params;
    const userId = req.user._id;

    const defaults = LandingPageContent.getDefaultContent();
    if (!defaults[section]) {
      return res.status(404).json({
        success: false,
        error: { message: 'Section not found' }
      });
    }

    const updated = await LandingPageContent.updateSectionContent(
      section,
      defaults[section],
      userId
    );

    res.json({
      success: true,
      message: 'Content reset to default successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error resetting section content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to reset section content' }
    });
  }
};

/**
 * Initialize default content (admin only)
 */
export const initializeDefaults = async (req, res) => {
  try {
    const content = await LandingPageContent.initializeDefaults();

    res.json({
      success: true,
      message: 'Default content initialized successfully',
      data: content
    });
  } catch (error) {
    console.error('Error initializing default content:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to initialize default content' }
    });
  }
};