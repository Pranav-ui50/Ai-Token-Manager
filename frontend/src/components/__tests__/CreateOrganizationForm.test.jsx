/**
 * Create Organization Form Tests
 *
 * Tests for organization creation form validation and submission.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateOrganizationForm from '../organizations/CreateOrganizationForm.jsx';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock the OrganizationContext
const mockCreateOrganization = vi.fn();
vi.mock('../../context/OrganizationContext.jsx', () => ({
  useOrganization: () => ({
    createOrganization: mockCreateOrganization
  })
}));

// Wrapper component with Router
const Wrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('CreateOrganizationForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Render Tests
  // ==========================================
  describe('rendering', () => {
    it('should render the form with all fields', () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show required indicator on name field', () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameLabel = screen.getByText(/organization name/i);
      expect(nameLabel).toBeInTheDocument();
    });

    it('should have autoFocus on name input', () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      expect(nameInput).toHaveFocus();
    });
  });

  // ==========================================
  // Validation Tests
  // ==========================================
  describe('validation', () => {
    it('should show error when name is empty', async () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when name exceeds 100 characters', async () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      const longName = 'a'.repeat(101);

      fireEvent.change(nameInput, { target: { name: 'name', value: longName } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name cannot exceed 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when description exceeds 500 characters', async () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'a'.repeat(501);

      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Org' } });
      fireEvent.change(descriptionInput, { target: { name: 'description', value: longDescription } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/description cannot exceed 500 characters/i)).toBeInTheDocument();
      });
    });

    it('should clear field error when user starts typing', async () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'New Org' } });

      await waitFor(() => {
        expect(screen.queryByText(/organization name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Submission Tests
  // ==========================================
  describe('submission', () => {
    it('should call createOrganization with form data', async () => {
      mockCreateOrganization.mockResolvedValueOnce({
        _id: 'org123',
        name: 'Test Organization',
        description: 'Test description'
      });

      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Organization' } });
      fireEvent.change(descriptionInput, { target: { name: 'description', value: 'Test description' } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith({
          name: 'Test Organization',
          description: 'Test description'
        });
      });
    });

    it('should show loading state during submission', async () => {
      mockCreateOrganization.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Organization' } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      // Check for loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show error message on submission failure', async () => {
      mockCreateOrganization.mockRejectedValueOnce({
        response: { data: { message: 'Organization already exists' } }
      });

      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Organization' } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization already exists/i)).toBeInTheDocument();
      });
    });

    it('should show generic error on submission failure', async () => {
      mockCreateOrganization.mockRejectedValueOnce(new Error('Network error'));

      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Organization' } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create organization/i)).toBeInTheDocument();
      });
    });

    it('should call onSuccess and navigate on successful creation', async () => {
      const mockOrg = {
        _id: 'org123',
        name: 'Test Organization',
        description: 'Test description'
      };

      mockCreateOrganization.mockResolvedValueOnce(mockOrg);

      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'Test Organization' } });

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/organizations/org123');
      });
    });
  });

  // ==========================================
  // Cancel Tests
  // ==========================================
  describe('cancel', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <Wrapper>
          <CreateOrganizationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Wrapper>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});