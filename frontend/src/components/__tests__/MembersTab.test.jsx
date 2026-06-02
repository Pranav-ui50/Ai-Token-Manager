/**
 * Members Tab Form Tests
 *
 * Tests for member management forms including add member, role changes, and removal.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MembersTab from '../organizations/MembersTab.jsx';

// Mock the OrganizationContext
const mockAddMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockUpdateMemberRole = vi.fn();
const mockTransferOwnership = vi.fn();
const mockGetOrganization = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../context/OrganizationContext.jsx', () => ({
  useOrganization: () => ({
    addMember: mockAddMember,
    removeMember: mockRemoveMember,
    updateMemberRole: mockUpdateMemberRole,
    transferOwnership: mockTransferOwnership,
    getOrganization: mockGetOrganization,
    clearError: mockClearError
  })
}));

// Mock the role API
vi.mock('../../services/api/role.api.js', () => ({
  default: {
    getOrganizationRoles: vi.fn().mockResolvedValue([
      { _id: 'role1', name: 'admin', displayName: 'Admin' },
      { _id: 'role2', name: 'member', displayName: 'Member' },
      { _id: 'role3', name: 'viewer', displayName: 'Viewer' }
    ])
  }
}));

// Mock localStorage
const mockUser = {
  _id: 'user123',
  id: 'user123',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role: { name: 'owner' }
};

beforeEach(() => {
  vi.clearAllMocks();
  Storage.prototype.getItem = vi.fn(() => JSON.stringify(mockUser));
});

describe('MembersTab', () => {
  const mockOrganization = {
    _id: 'org123',
    name: 'Test Organization',
    owner: { _id: 'user123', firstName: 'Test', lastName: 'User' },
    members: [
      {
        user: { _id: 'user123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        role: { name: 'owner', displayName: 'Owner' },
        joinedAt: new Date().toISOString()
      },
      {
        user: { _id: 'user456', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        role: { name: 'admin', displayName: 'Admin' },
        joinedAt: new Date().toISOString()
      }
    ]
  };

  // ==========================================
  // Render Tests
  // ==========================================
  describe('rendering', () => {
    it('should render members list', () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show owner badge for organization owner', () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    it('should show Add Member button', () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    });

    it('should show action buttons for non-owner members', () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      // Check that action buttons are visible for non-owner members
      const editButtons = screen.getAllByTitle(/edit role/i);
      const transferButtons = screen.getAllByTitle(/transfer ownership/i);
      const removeButtons = screen.getAllByTitle(/remove member/i);

      expect(editButtons.length).toBeGreaterThan(0);
      expect(transferButtons.length).toBeGreaterThan(0);
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // Add Member Tests
  // ==========================================
  describe('add member', () => {
    it('should open add member modal when button clicked', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email id/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for empty fields', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /add member/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email id/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      });

      const submitButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const passwordInput = screen.getByPlaceholderText(/enter a password/i);
        fireEvent.change(passwordInput, { target: { value: 'short' } });
      });

      const submitButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should call addMember with form data', async () => {
      mockAddMember.mockResolvedValueOnce({});

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
        fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
        fireEvent.change(screen.getByLabelText(/email id/i), { target: { value: 'jane@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/enter a password/i), { target: { value: 'password123' } });
      });

      // Select role
      const roleSelect = screen.getByLabelText(/role/i);
      fireEvent.change(roleSelect, { target: { value: 'role2' } });

      const submitButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddMember).toHaveBeenCalledWith('org123', {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          password: 'password123',
          roleId: 'role2'
        });
      });
    });

    it('should show error for duplicate member', async () => {
      mockAddMember.mockRejectedValueOnce({
        response: {
          data: {
            error: { code: 'ALREADY_MEMBER', message: 'User already a member' }
          }
        }
      });

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(async () => {
        fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
        fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
        fireEvent.change(screen.getByLabelText(/email id/i), { target: { value: 'john@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/enter a password/i), { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', { name: /add member/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/already a member/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Role Change Tests
  // ==========================================
  describe('change role', () => {
    it('should open role change modal', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const editButtons = screen.getAllByTitle(/edit role/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/change member role/i)).toBeInTheDocument();
      });
    });

    it('should call updateMemberRole', async () => {
      mockUpdateMemberRole.mockResolvedValueOnce({});

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const editButtons = screen.getAllByTitle(/edit role/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const roleSelect = screen.getByLabelText(/new role/i);
        fireEvent.change(roleSelect, { target: { value: 'role3' } });
      });

      const submitButton = screen.getByRole('button', { name: /update role/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateMemberRole).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // Remove Member Tests
  // ==========================================
  describe('remove member', () => {
    it('should confirm before removal', async () => {
      const mockConfirm = vi.fn(() => true);
      window.confirm = mockConfirm;

      mockRemoveMember.mockResolvedValueOnce({});

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const removeButtons = screen.getAllByTitle(/remove member/i);
      fireEvent.click(removeButtons[0]);

      expect(mockConfirm).toHaveBeenCalled();
    });

    it('should call removeMember after confirmation', async () => {
      window.confirm = vi.fn(() => true);
      mockRemoveMember.mockResolvedValueOnce({});

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const removeButtons = screen.getAllByTitle(/remove member/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveMember).toHaveBeenCalled();
      });
    });

    it('should not remove member if not confirmed', async () => {
      window.confirm = vi.fn(() => false);

      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const removeButtons = screen.getAllByTitle(/remove member/i);
      fireEvent.click(removeButtons[0]);

      expect(mockRemoveMember).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Transfer Ownership Tests
  // ==========================================
  describe('transfer ownership', () => {
    it('should open transfer ownership modal', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const transferButtons = screen.getAllByTitle(/transfer ownership/i);
      fireEvent.click(transferButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/transfer ownership/i)).toBeInTheDocument();
      });
    });

    it('should show warning in transfer modal', async () => {
      render(<MembersTab organization={mockOrganization} organizationId="org123" />);

      const transferButtons = screen.getAllByTitle(/transfer ownership/i);
      fireEvent.click(transferButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/action cannot be undone/i)).toBeInTheDocument();
      });
    });
  });
});