/**
 * Footer Component
 *
 * Landing page footer with links and information.
 * Dynamic content fetched from API.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import publicApi from '../../../services/api/public.api.js';

// Default footer content as fallback
const defaultFooterContent = {
  companyName: 'TokenManager',
  tagline: 'The complete platform for managing AI token usage, costs, and subscriptions.',
  socialLinks: [
    { name: 'Twitter', url: 'https://twitter.com/tokenmanager', icon: 'twitter' },
    { name: 'LinkedIn', url: 'https://linkedin.com/company/tokenmanager', icon: 'linkedin' },
    { name: 'GitHub', url: 'https://github.com/tokenmanager', icon: 'github' }
  ],
  productLinks: [
    { label: 'Features', url: '/#features' },
    { label: 'Pricing', url: '/#pricing' },
    { label: 'Providers', url: '/#providers' },
    { label: 'API Documentation', url: '/docs' }
  ],
  companyLinks: [
    { label: 'About Us', url: '/about' },
    { label: 'Careers', url: '/careers' },
    { label: 'Blog', url: '/blog' },
    { label: 'Contact', url: '/contact' }
  ],
  legalLinks: [
    { label: 'Privacy Policy', url: '#' },
    { label: 'Terms of Service', url: '#' },
    { label: 'Cookie Policy', url: '#' }
  ]
};

// Icon components
const socialIcons = {
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [footerContent, setFooterContent] = useState(defaultFooterContent);

  // Fetch dynamic content from API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await publicApi.getLandingSection('footer');
        if (response.success && response.data) {
          setFooterContent({
            companyName: response.data.companyName || defaultFooterContent.companyName,
            tagline: response.data.tagline || defaultFooterContent.tagline,
            socialLinks: response.data.socialLinks || defaultFooterContent.socialLinks,
            productLinks: response.data.productLinks || defaultFooterContent.productLinks,
            companyLinks: response.data.companyLinks || defaultFooterContent.companyLinks,
            legalLinks: response.data.legalLinks || defaultFooterContent.legalLinks
          });
        }
      } catch (error) {
        console.log('Using default footer content:', error);
      }
    };

    fetchContent();
  }, []);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#DC2626] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold">{footerContent.companyName}</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm">
              {footerContent.tagline}
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {footerContent.socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#DC2626] hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  {socialIcons[social.icon] || socialIcons.twitter}
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerContent.productLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerContent.companyLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerContent.legalLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.url}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} {footerContent.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;