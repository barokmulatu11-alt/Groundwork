'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { supabase, Profile } from '@/lib/supabase';
import { EmailTemplate, EmailLog, DEFAULT_VARIABLES } from '@/lib/email-templates';
import {
  Mail,
  Plus,
  RefreshCw,
  Send,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  History,
  Layers,
  Settings,
  UserCheck,
  Check,
  Code,
  X,
  ChevronDown,
  Sliders,
  Type
} from 'lucide-react';
import clsx from 'clsx';
import ReactRichTextEditor from '@/components/email/ReactRichTextEditor';
import HtmlCustomizer from '@/components/email/HtmlCustomizer';

type TabType = 'templates' | 'editor' | 'composer' | 'logs';
type EditorSubMode = 'wysiwyg' | 'customizer' | 'code';

export default function EmailDashboardPage() {
  const { isDark } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('templates');

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // SMTP Connection State
  const [smtpStatus, setSmtpStatus] = useState<{
    ok: boolean;
    message: string;
    config?: any;
    checking: boolean;
  }>({
    ok: false,
    message: 'Checking SMTP...',
    checking: true,
  });

  // SMTP Config Modal State
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpFormUser, setSmtpFormUser] = useState('');
  const [smtpFormPass, setSmtpFormPass] = useState('');
  const [smtpFormFromName, setSmtpFormFromName] = useState('');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpModalFeedback, setSmtpModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openSmtpModal = () => {
    setSmtpFormUser(smtpStatus.config?.user || 'barok.m.lakew@gmail.com');
    setSmtpFormFromName(smtpStatus.config?.fromName || 'Groundwork');
    setSmtpFormPass('');
    setSmtpModalFeedback(null);
    setShowSmtpModal(true);
  };

  const saveSmtpCredentials = async () => {
    if (!smtpFormPass.trim()) {
      setSmtpModalFeedback({
        type: 'error',
        message: 'Please enter your 16-character Google App Password.',
      });
      return;
    }
    setSmtpSaving(true);
    setSmtpModalFeedback(null);
    try {
      const res = await fetch('/api/emails/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: smtpFormUser.trim(),
          pass: smtpFormPass.trim(),
          fromName: smtpFormFromName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpModalFeedback({
          type: 'success',
          message: 'Connection verified! Your SMTP credentials were saved successfully.',
        });
        showToast('SMTP connected & credentials updated!', 'success');
        checkSmtpConnection();
      } else {
        setSmtpModalFeedback({
          type: 'error',
          message: data.error || 'Failed to authenticate with Google SMTP.',
        });
      }
    } catch (err: any) {
      setSmtpModalFeedback({
        type: 'error',
        message: err.message || 'Network error while testing SMTP credentials.',
      });
    } finally {
      setSmtpSaving(false);
    }
  };

  // Editor State
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorCategory, setEditorCategory] = useState<EmailTemplate['category']>('custom');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [editorText, setEditorText] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTab, setPreviewTab] = useState<'visual' | 'code'>('visual');
  const [editorSubMode, setEditorSubMode] = useState<EditorSubMode>('wysiwyg');

  // Helpers for syncing card inner content and full HTML layout
  const extractCardInner = (html: string): string => {
    const match = html.match(/<div class="card"[^>]*>([\s\S]*?)<\/div>\s*<div class="footer"/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return html;
  };

  const replaceCardInner = (fullHtml: string, newInner: string): string => {
    const regex = /(<div class="card"[^>]*>)([\s\S]*?)(<\/div>\s*<div class="footer")/i;
    if (regex.test(fullHtml)) {
      return fullHtml.replace(regex, `$1\n${newInner}\n$3`);
    }
    return newInner;
  };

  // Test Variables for Live Preview
  const [testVariables, setTestVariables] = useState<Record<string, string>>(DEFAULT_VARIABLES);

  // Quick Test Send from Editor
  const [quickTestEmail, setQuickTestEmail] = useState('barok.m.lakew@gmail.com');
  const [sendingQuickTest, setSendingQuickTest] = useState(false);
  const [quickTestAlert, setQuickTestAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Registered Users for Composer
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Composer State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [composerRecipientMode, setComposerRecipientMode] = useState<
    'all_users' | 'pro_users' | 'free_users' | 'bulk_list' | 'single_user' | 'custom_email'
  >('all_users');
  const [composerBulkText, setComposerBulkText] = useState('');
  const [composerCustomEmail, setComposerCustomEmail] = useState('');
  const [composerSelectedUserId, setComposerSelectedUserId] = useState('');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerHtml, setComposerHtml] = useState('');
  const [composerVariables, setComposerVariables] = useState<Record<string, string>>({
    ...DEFAULT_VARIABLES,
    action_url: 'https://barok-labs.pro.et/open.html',
  });
  const [sendingComposer, setSendingComposer] = useState(false);
  const [composerFeedback, setComposerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Toast / Global Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Check SMTP Status
  const checkSmtpConnection = async () => {
    setSmtpStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/emails/test-connection', { method: 'POST' });
      const data = await res.json();
      setSmtpStatus({
        ok: data.ok,
        message: data.message,
        config: data.config,
        checking: false,
      });
      if (data.config?.fromEmail && !quickTestEmail) {
        setQuickTestEmail(data.config.fromEmail);
      }
    } catch (err: any) {
      setSmtpStatus({
        ok: false,
        message: err.message || 'Failed to check SMTP connection',
        checking: false,
      });
    }
  };

  // 2. Fetch Templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/emails/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        if (!selectedTemplateId && data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 3. Fetch Registered Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 4. Fetch Sent Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/emails/logs');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    checkSmtpConnection();
    fetchTemplates();
    fetchUsers();
    fetchLogs();
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || tpl.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, categoryFilter]);

  // Handle Loading a Template into the Editor
  const openEditor = (template: EmailTemplate | null) => {
    if (template) {
      setEditingTemplate(template);
      setEditorName(template.name);
      setEditorCategory(template.category);
      setEditorSubject(template.subject);
      setEditorHtml(template.body_html);
      setEditorText(template.body_text || '');
      setEditorDescription(template.description || '');
    } else {
      // Create New
      setEditingTemplate(null);
      setEditorName('New Email Template');
      setEditorCategory('custom');
      setEditorSubject('Groundwork: {{message_subject}}');
      setEditorDescription('Custom email template for users');
      const starterHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #0b0f19; font-family: -apple-system, sans-serif; color: #f3f4f6; padding: 24px 0; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 18px; max-width: 560px; margin: 0 auto; padding: 36px 30px; }
    .logo { color: #0066FF; font-weight: 900; font-size: 24px; text-decoration: none; }
    h1 { color: #fff; font-size: 22px; font-weight: 800; margin: 20px 0 10px; }
    p { color: #9ca3af; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #0066FF; color: #fff !important; font-weight: 700; padding: 12px 28px; border-radius: 12px; text-decoration: none; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="text-align: center;"><span class="logo">groundwork.</span></div>
    <h1>Hello {{user_name}},</h1>
    <p>This is your custom template content. You can insert any dynamic variables like {{app_name}} or {{action_url}}.</p>
    <div style="text-align: center;">
      <a href="{{action_url}}" class="btn">Take Action</a>
    </div>
  </div>
</body>
</html>`;
      setEditorHtml(starterHtml);
      setEditorText('Hello {{user_name}},\n\nThis is your custom template content.\n\nTake action: {{action_url}}');
    }
    setQuickTestAlert(null);
    setActiveTab('editor');
  };

  // Save Template
  const saveTemplate = async () => {
    if (!editorName.trim() || !editorSubject.trim() || !editorHtml.trim()) {
      showToast('Please fill out name, subject, and HTML body', 'error');
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        // Update
        const res = await fetch(`/api/emails/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editorName,
            category: editorCategory,
            subject: editorSubject,
            description: editorDescription,
            body_html: editorHtml,
            body_text: editorText,
          }),
        });
        const data = await res.json();
        if (data.template) {
          showToast(`Saved template "${editorName}"!`, 'success');
          setEditingTemplate(data.template);
          await fetchTemplates();
        } else {
          showToast(data.error || 'Failed to save', 'error');
        }
      } else {
        // Create
        const res = await fetch('/api/emails/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editorName,
            category: editorCategory,
            subject: editorSubject,
            description: editorDescription,
            body_html: editorHtml,
            body_text: editorText,
          }),
        });
        const data = await res.json();
        if (data.template) {
          showToast(`Created template "${editorName}"!`, 'success');
          setEditingTemplate(data.template);
          await fetchTemplates();
        } else {
          showToast(data.error || 'Failed to create', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Reset Template to Default
  const resetTemplate = async (templateId: string) => {
    if (!confirm('Reset this template back to its default code and layout?')) return;
    try {
      const res = await fetch(`/api/emails/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.template) {
        showToast('Template reset to default!', 'success');
        if (editingTemplate?.id === templateId) {
          openEditor(data.template);
        }
        await fetchTemplates();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reset template', 'error');
    }
  };

  // Delete Template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/emails/templates/${templateId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Template deleted successfully', 'info');
        if (editingTemplate?.id === templateId) {
          setActiveTab('templates');
        }
        await fetchTemplates();
      } else {
        showToast(data.error || 'Could not delete template', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template', 'error');
    }
  };

  // Send Quick Test from Editor
  const sendQuickTest = async () => {
    if (!quickTestEmail.trim()) {
      setQuickTestAlert({ type: 'error', message: 'Enter a recipient email address.' });
      return;
    }

    setSendingQuickTest(true);
    setQuickTestAlert(null);
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: quickTestEmail.trim(),
          templateId: editingTemplate?.id,
          templateName: editorName,
          subject: editorSubject,
          html: editorHtml,
          text: editorText,
          variables: testVariables,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickTestAlert({
          type: 'success',
          message: `Email delivered to ${quickTestEmail}! Message ID: ${data.messageId || 'OK'}`,
        });
        showToast(`Test email delivered to ${quickTestEmail}!`, 'success');
        fetchLogs();
      } else {
        setQuickTestAlert({
          type: 'error',
          message: data.error || 'Failed to deliver test email.',
        });
      }
    } catch (err: any) {
      setQuickTestAlert({
        type: 'error',
        message: err.message || 'Network error while sending test email.',
      });
    } finally {
      setSendingQuickTest(false);
    }
  };

  // Compile Dynamic Preview
  const compiledPreviewHtml = useMemo(() => {
    let result = editorHtml;
    for (const [key, val] of Object.entries(testVariables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\}`, 'g');
      result = result.replace(regex, val || `{{${key}}}`);
    }
    return result;
  }, [editorHtml, testVariables]);

  const compiledPreviewSubject = useMemo(() => {
    let result = editorSubject;
    for (const [key, val] of Object.entries(testVariables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\}`, 'g');
      result = result.replace(regex, val || `{{${key}}}`);
    }
    return result;
  }, [editorSubject, testVariables]);

  // Detected Variables in Editor
  const detectedVariables = useMemo(() => {
    const text = `${editorSubject} ${editorHtml} ${editorText}`;
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[\{\}\s]/g, ''))));
  }, [editorSubject, editorHtml, editorText]);

  // Insert Variable at cursor or append
  const insertVariableIntoHtml = (varName: string) => {
    const token = `{{${varName}}}`;
    setEditorHtml((prev) => prev + ` ${token}`);
    showToast(`Appended ${token} to HTML`, 'info');
  };

  // Synchronize Composer when selectedTemplateId changes
  useEffect(() => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setComposerSubject(tpl.subject);
      setComposerHtml(tpl.body_html);
      setComposerVariables({ ...DEFAULT_VARIABLES });
    }
  }, [selectedTemplateId, templates]);

  // When selected user changes in Composer
  const handleComposerUserSelect = (userId: string) => {
    setComposerSelectedUserId(userId);
    const u = users.find((item) => item.id === userId);
    if (u) {
      setComposerVariables((prev) => ({
        ...prev,
        user_name: u.full_name || u.username || 'Valued Member',
        user_email: u.email || '',
        pro_plan: u.pro_status ? 'Groundwork Pro' : 'Free Tier',
      }));
    }
  };

  // Compute Active Target Recipients for Broadcast
  const targetRecipients = useMemo(() => {
    if (composerRecipientMode === 'all_users') {
      return users
        .filter((u) => u.email && u.email.includes('@'))
        .map((u) => ({
          email: u.email!,
          name: u.full_name || u.username || 'Groundwork Member',
          variables: {
            user_name: u.full_name || u.username || 'Groundwork Member',
            user_email: u.email!,
            pro_plan: u.pro_status ? 'Groundwork Pro' : 'Free Tier',
          },
        }));
    }
    if (composerRecipientMode === 'pro_users') {
      return users
        .filter((u) => u.pro_status && u.email && u.email.includes('@'))
        .map((u) => ({
          email: u.email!,
          name: u.full_name || u.username || 'Groundwork Member',
          variables: {
            user_name: u.full_name || u.username || 'Groundwork Member',
            user_email: u.email!,
            pro_plan: 'Groundwork Pro',
          },
        }));
    }
    if (composerRecipientMode === 'free_users') {
      return users
        .filter((u) => !u.pro_status && u.email && u.email.includes('@'))
        .map((u) => ({
          email: u.email!,
          name: u.full_name || u.username || 'Groundwork Member',
          variables: {
            user_name: u.full_name || u.username || 'Groundwork Member',
            user_email: u.email!,
            pro_plan: 'Free Tier',
          },
        }));
    }
    if (composerRecipientMode === 'single_user') {
      const u = users.find((item) => item.id === composerSelectedUserId);
      if (u && u.email && u.email.includes('@')) {
        return [{
          email: u.email,
          name: u.full_name || u.username || 'Groundwork Member',
          variables: {
            user_name: u.full_name || u.username || 'Groundwork Member',
            user_email: u.email,
            pro_plan: u.pro_status ? 'Groundwork Pro' : 'Free Tier',
          },
        }];
      }
      return [];
    }
    if (composerRecipientMode === 'custom_email') {
      const email = composerCustomEmail.trim();
      if (email && email.includes('@')) {
        return [{
          email,
          name: 'Groundwork Member',
          variables: { user_name: 'Groundwork Member', user_email: email },
        }];
      }
      return [];
    }
    if (composerRecipientMode === 'bulk_list') {
      const emails = Array.from(new Set(
        composerBulkText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.includes('@'))
      ));
      return emails.map((email) => ({
        email,
        name: 'Groundwork Member',
        variables: { user_name: 'Groundwork Member', user_email: email },
      }));
    }
    return [];
  }, [composerRecipientMode, users, composerSelectedUserId, composerCustomEmail, composerBulkText]);

  // Send Broadcast from Composer
  const sendFromComposer = async () => {
    if (targetRecipients.length === 0) {
      setComposerFeedback({ type: 'error', message: 'No valid recipient email addresses found for this audience.' });
      return;
    }
    if (!composerSubject.trim()) {
      setComposerFeedback({ type: 'error', message: 'Subject line cannot be empty.' });
      return;
    }

    if (targetRecipients.length > 1) {
      const confirmed = window.confirm(`Deliver email broadcast to all ${targetRecipients.length} recipients now?`);
      if (!confirmed) return;
    }

    setSendingComposer(true);
    setComposerFeedback(null);
    try {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const cleanVars = { ...composerVariables };
      if (cleanVars.action_url && cleanVars.action_url.startsWith('/')) {
        cleanVars.action_url = `https://barok-labs.pro.et${cleanVars.action_url}`;
      }

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetRecipients.length === 1 ? targetRecipients[0].email : targetRecipients.map((r) => r.email),
          recipients: targetRecipients,
          templateId: selectedTemplateId,
          templateName: tpl?.name || 'Broadcast Email',
          subject: composerSubject || tpl?.subject || 'Groundwork Notification',
          html: composerHtml || tpl?.body_html || '',
          variables: cleanVars,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.isBulk) {
          setComposerFeedback({
            type: 'success',
            message: `🎉 Broadcast sent successfully! Delivered: ${data.sentCount} of ${data.total} recipients${data.failedCount > 0 ? ` (${data.failedCount} failed)` : ''}.`,
          });
          showToast(`Broadcast delivered to ${data.sentCount} recipients!`, 'success');
        } else {
          setComposerFeedback({
            type: 'success',
            message: `Email successfully delivered to ${targetRecipients[0].email} via Nodemailer!`,
          });
          showToast(`Email delivered to ${targetRecipients[0].email}!`, 'success');
        }
        fetchLogs();
      } else {
        setComposerFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch email broadcast.',
        });
      }
    } catch (err: any) {
      setComposerFeedback({
        type: 'error',
        message: err.message || 'Error occurred while sending broadcast.',
      });
    } finally {
      setSendingComposer(false);
    }
  };

  // Quick Test Send to Admin
  const sendTestToAdmin = async () => {
    if (!composerSubject.trim()) {
      setComposerFeedback({ type: 'error', message: 'Subject line cannot be empty.' });
      return;
    }
    setSendingComposer(true);
    setComposerFeedback(null);
    try {
      const adminEmail = smtpStatus.config?.fromEmail || 'barok.m.lakew@gmail.com';
      const cleanVars = { ...composerVariables };
      if (cleanVars.action_url && cleanVars.action_url.startsWith('/')) {
        cleanVars.action_url = `https://barok-labs.pro.et${cleanVars.action_url}`;
      }

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminEmail,
          templateId: selectedTemplateId,
          templateName: `[Test] ${templates.find((t) => t.id === selectedTemplateId)?.name || 'Email'}`,
          subject: `[Test Preview] ${composerSubject}`,
          html: composerHtml,
          variables: {
            ...cleanVars,
            user_name: 'Barok (Admin Preview)',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComposerFeedback({
          type: 'success',
          message: `Test email sent to your admin inbox (${adminEmail})! Check your email to verify how it renders.`,
        });
        showToast(`Test delivered to ${adminEmail}`, 'success');
        fetchLogs();
      } else {
        setComposerFeedback({
          type: 'error',
          message: data.error || 'Failed to send test email.',
        });
      }
    } catch (err: any) {
      setComposerFeedback({
        type: 'error',
        message: err.message || 'Error sending test email.',
      });
    } finally {
      setSendingComposer(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!confirm('Clear all sent email logs?')) return;
    try {
      await fetch('/api/emails/logs', { method: 'DELETE' });
      setLogs([]);
      showToast('Sent email logs cleared', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Category Color Map
  const categoryBadgeColors: Record<string, string> = {
    onboarding: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    marketing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    announcement: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    security: 'bg-red-500/15 text-red-400 border-red-500/30',
    system: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    custom: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={clsx(
            'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all backdrop-blur-md animate-in slide-in-from-bottom-4',
            toast.type === 'success' && 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
            toast.type === 'error' && 'bg-red-950/90 border-red-500/40 text-red-200',
            toast.type === 'info' && 'bg-blue-950/90 border-blue-500/40 text-blue-200'
          )}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={18} className="text-red-400 shrink-0" />}
          {toast.type === 'info' && <Mail size={18} className="text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & SMTP Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/25">
              <Mail size={24} />
            </div>
            <div>
              <h1 className={clsx('text-2xl font-black transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
                Email Center & Templates
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">
                Customizable HTML templates, dynamic variables, and automated sending with Nodemailer
              </p>
            </div>
          </div>
        </div>

        {/* SMTP Status Pill */}
        <div className="flex items-center gap-3">
          <div
            onClick={openSmtpModal}
            className={clsx(
              'flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.02]',
              smtpStatus.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            )}
            title="Click to view and configure Google App Password / SMTP credentials"
          >
            <div
              className={clsx(
                'w-2 h-2 rounded-full',
                smtpStatus.ok ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              )}
            />
            <div className="flex flex-col">
              <span className="font-bold flex items-center gap-1.5">
                {smtpStatus.ok ? 'SMTP Connected' : smtpStatus.checking ? 'Connecting...' : 'SMTP Check'}
                <Settings size={12} className="opacity-70 hover:opacity-100" />
              </span>
              <span className="text-[10px] opacity-80">
                {smtpStatus.config?.fromEmail || 'barok.m.lakew@gmail.com'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkSmtpConnection();
              }}
              disabled={smtpStatus.checking}
              title="Test SMTP connection again"
              className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-1"
            >
              <RefreshCw size={12} className={clsx(smtpStatus.checking && 'animate-spin')} />
            </button>
          </div>

          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold shadow-lg hover:bg-[#0066dd] transition-all"
          >
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={clsx('flex items-center gap-1.5 p-1 rounded-2xl border w-fit', isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-slate-100 border-slate-200')}>
        <button
          onClick={() => setActiveTab('templates')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'templates'
              ? 'bg-[#0066FF] text-white shadow-md'
              : isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          )}
        >
          <Layers size={14} /> Templates ({templates.length})
        </button>

        <button
          onClick={() => {
            if (!editingTemplate && templates.length > 0) {
              openEditor(templates[0]);
            } else {
              setActiveTab('editor');
            }
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'editor'
              ? 'bg-[#0066FF] text-white shadow-md'
              : isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          )}
        >
          <Edit3 size={14} /> Template Customizer
        </button>

        <button
          onClick={() => setActiveTab('composer')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'composer'
              ? 'bg-[#0066FF] text-white shadow-md'
              : isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          )}
        >
          <Send size={14} /> Send Email / Broadcast
        </button>

        <button
          onClick={() => {
            setActiveTab('logs');
            fetchLogs();
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'logs'
              ? 'bg-[#0066FF] text-white shadow-md'
              : isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          )}
        >
          <History size={14} /> Sent Logs ({logs.length})
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: TEMPLATES GALLERY
         ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Controls: Search and Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(
                  'w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs outline-none transition-all',
                  isDark
                    ? 'bg-gray-900/60 border-gray-800 text-white placeholder-gray-500 focus:border-[#0066FF]'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#0066FF]'
                )}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
              {['all', 'onboarding', 'marketing', 'system', 'announcement', 'security', 'custom'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border whitespace-nowrap',
                    categoryFilter === cat
                      ? 'bg-[#0066FF]/15 text-[#0066FF] border-[#0066FF]/40'
                      : isDark
                      ? 'bg-gray-900/40 text-gray-400 border-gray-800 hover:text-white'
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {loadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={clsx('h-56 rounded-2xl animate-pulse', isDark ? 'bg-gray-900/40' : 'bg-slate-100')} />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Mail size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-bold">No templates found</p>
              <p className="text-xs mt-1">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={clsx(
                    'glass rounded-2xl p-5 border flex flex-col justify-between transition-all hover:border-[#0066FF]/40 shadow-sm group',
                    isDark ? 'border-gray-800/80 bg-gray-900/30' : 'border-slate-200 bg-white'
                  )}
                >
                  <div>
                    {/* Top Row: Category badge & Actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={clsx(
                          'text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider',
                          categoryBadgeColors[template.category] || categoryBadgeColors.custom
                        )}
                      >
                        {template.category}
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {template.is_default && (
                          <button
                            onClick={() => resetTemplate(template.id)}
                            title="Reset template to default code"
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-amber-400 transition-colors"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {!template.is_default && (
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            title="Delete template"
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className={clsx('text-base font-bold mb-1 transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
                      {template.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                      {template.description || 'No description provided.'}
                    </p>

                    {/* Subject line preview */}
                    <div className={clsx('p-2.5 rounded-xl border text-xs font-mono mb-3 truncate', isDark ? 'bg-black/30 border-white/5 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                      <span className="text-gray-500 font-sans font-bold text-[10px] block mb-0.5">SUBJECT</span>
                      {template.subject}
                    </div>

                    {/* Variables chips */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.variables.slice(0, 4).map((v) => (
                        <span
                          key={v}
                          className={clsx(
                            'text-[10px] px-2 py-0.5 rounded-md font-mono border',
                            isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                          )}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {template.variables.length > 4 && (
                        <span className="text-[10px] text-gray-500 px-1 py-0.5">
                          +{template.variables.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Buttons */}
                  <div className="pt-3 border-t border-gray-800/40 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openEditor(template)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0066FF]/15 text-[#0066FF] hover:bg-[#0066FF]/25 border border-[#0066FF]/30 text-xs font-bold transition-all"
                    >
                      <Edit3 size={12} /> Customize
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setActiveTab('composer');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all border border-white/10"
                    >
                      <Send size={12} /> Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: TEMPLATE CUSTOMIZER & LIVE PREVIEW
         ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'editor' && (
        <div className="space-y-5">
          {/* Editor Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl glass border border-gray-800/60">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('templates')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                title="Back to gallery"
              >
                <Layers size={14} />
              </button>
              <div>
                <h2 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  {editingTemplate ? `Editing: ${editingTemplate.name}` : 'Creating New Template'}
                </h2>
                <p className="text-xs text-gray-500">Live variables substitution and responsive preview</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {editingTemplate?.is_default && (
                <button
                  onClick={() => resetTemplate(editingTemplate.id)}
                  className="px-3 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={12} /> Reset to Default
                </button>
              )}

              <button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0066dd] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingTemplate ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Main Editor Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Code & Metadata Form (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Template Metadata */}
              <div className={clsx('p-4 rounded-2xl border glass space-y-3', isDark ? 'border-gray-800' : 'border-slate-200')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Template Name</label>
                    <input
                      type="text"
                      value={editorName}
                      onChange={(e) => setEditorName(e.target.value)}
                      className={clsx(
                        'w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none',
                        isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Category</label>
                    <select
                      value={editorCategory}
                      onChange={(e) => setEditorCategory(e.target.value as any)}
                      className={clsx(
                        'w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none capitalize',
                        isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                      )}
                    >
                      {['onboarding', 'marketing', 'system', 'announcement', 'security', 'custom'].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={editorSubject}
                    onChange={(e) => setEditorSubject(e.target.value)}
                    placeholder="e.g. Welcome to Groundwork, {{user_name}}!"
                    className={clsx(
                      'w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none',
                      isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                    )}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Description / Purpose</label>
                  <input
                    type="text"
                    value={editorDescription}
                    onChange={(e) => setEditorDescription(e.target.value)}
                    placeholder="Internal note explaining when this template is sent"
                    className={clsx(
                      'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                      isDark ? 'bg-black/30 border-gray-800 text-gray-300 focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#0066FF]'
                    )}
                  />
                </div>
              </div>

              {/* Editor Sub-Mode Selector */}
              <div className="flex items-center justify-between p-1.5 rounded-2xl glass border border-gray-800">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setEditorSubMode('wysiwyg')}
                    className={clsx(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-initial justify-center',
                      editorSubMode === 'wysiwyg'
                        ? 'bg-[#0066FF] text-white shadow-md'
                        : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    )}
                  >
                    <Type size={14} /> React Text Editor
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorSubMode('customizer')}
                    className={clsx(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-initial justify-center',
                      editorSubMode === 'customizer'
                        ? 'bg-[#0066FF] text-white shadow-md'
                        : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    )}
                  >
                    <Sliders size={14} /> HTML Customizer
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorSubMode('code')}
                    className={clsx(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-initial justify-center',
                      editorSubMode === 'code'
                        ? 'bg-[#0066FF] text-white shadow-md'
                        : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    )}
                  >
                    <Code size={14} /> Raw HTML Code
                  </button>
                </div>
              </div>

              {/* Sub-Mode 1: React Rich Text WYSIWYG Editor */}
              {editorSubMode === 'wysiwyg' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs px-1 text-gray-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Type size={13} className="text-[#0066FF]" /> Visual WYSIWYG Content Editor
                    </span>
                    <span className="text-[10px] text-gray-500">Live dual-sync with email template</span>
                  </div>
                  <ReactRichTextEditor
                    initialHtml={extractCardInner(editorHtml)}
                    onChange={(newInner) => {
                      setEditorHtml(replaceCardInner(editorHtml, newInner));
                    }}
                    variables={Object.keys(DEFAULT_VARIABLES)}
                  />
                </div>
              )}

              {/* Sub-Mode 2: HTML Visual Customizer */}
              {editorSubMode === 'customizer' && (
                <div className="space-y-3">
                  <HtmlCustomizer
                    currentHtml={editorHtml}
                    innerContent={extractCardInner(editorHtml)}
                    onApplyCustomization={(newHtml) => {
                      setEditorHtml(newHtml);
                      showToast('Applied visual styling and theme to template!', 'success');
                    }}
                  />
                </div>
              )}

              {/* Sub-Mode 3: Raw HTML Code Editor */}
              {editorSubMode === 'code' && (
                <div className="space-y-3">
                  {/* Variables Toolbar */}
                  <div className={clsx('p-3 rounded-2xl border glass', isDark ? 'border-gray-800' : 'border-slate-200')}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#0066FF]" /> Click to Insert Variable
                      </span>
                      <span className="text-[10px] text-gray-500">{detectedVariables.length} variables detected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(DEFAULT_VARIABLES).map((vKey) => (
                        <button
                          key={vKey}
                          type="button"
                          onClick={() => insertVariableIntoHtml(vKey)}
                          className={clsx(
                            'text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1',
                            detectedVariables.includes(vKey)
                              ? 'bg-[#0066FF]/15 border-[#0066FF]/40 text-[#0066FF] font-bold'
                              : isDark
                              ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                          )}
                        >
                          <span>{`{{${vKey}}}`}</span>
                          <Plus size={10} className="opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML Code Editor */}
                  <div className={clsx('rounded-2xl border glass overflow-hidden', isDark ? 'border-gray-800' : 'border-slate-200')}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60 bg-black/20">
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                        <Code size={13} className="text-[#0066FF]" /> Template Body (Responsive HTML)
                      </span>
                      <span className="text-[10px] text-gray-500">Supports full inline CSS & tables</span>
                    </div>
                    <textarea
                      rows={18}
                      value={editorHtml}
                      onChange={(e) => setEditorHtml(e.target.value)}
                      className={clsx(
                        'w-full p-4 font-mono text-xs leading-relaxed outline-none resize-y',
                        isDark ? 'bg-gray-950/80 text-emerald-300' : 'bg-slate-50 text-slate-900'
                      )}
                      placeholder="<!DOCTYPE html>..."
                    />
                  </div>
                </div>
              )}

              {/* Plain Text Fallback */}
              <div className={clsx('p-4 rounded-2xl border glass space-y-2', isDark ? 'border-gray-800' : 'border-slate-200')}>
                <label className="text-[11px] font-bold uppercase text-gray-500 block">Plain Text Fallback (Non-HTML clients)</label>
                <textarea
                  rows={4}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  className={clsx(
                    'w-full p-3 font-mono text-xs rounded-xl border outline-none resize-y',
                    isDark ? 'bg-black/30 border-gray-800 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  )}
                />
              </div>
            </div>

            {/* Right: Live Preview & Test Sending (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
              {/* Preview Controls */}
              <div className={clsx('p-4 rounded-2xl border glass space-y-3', isDark ? 'border-gray-800' : 'border-slate-200')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-[#0066FF]" />
                    <span className="text-xs font-bold">Real-time Preview</span>
                  </div>

                  {/* Device toggle */}
                  <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={clsx(
                        'p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1',
                        previewMode === 'desktop' ? 'bg-[#0066FF] text-white' : 'text-gray-400 hover:text-white'
                      )}
                      title="Desktop view"
                    >
                      <Monitor size={13} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={clsx(
                        'p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1',
                        previewMode === 'mobile' ? 'bg-[#0066FF] text-white' : 'text-gray-400 hover:text-white'
                      )}
                      title="Mobile view (375px)"
                    >
                      <Smartphone size={13} />
                    </button>
                  </div>
                </div>

                {/* Subject preview */}
                <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">SUBJECT PREVIEW</span>
                  <span className="font-semibold text-white">{compiledPreviewSubject || '(No subject)'}</span>
                </div>

                {/* Live Sandbox / Iframe */}
                <div className="flex justify-center bg-gray-950 p-3 rounded-xl border border-gray-800 overflow-hidden min-h-[420px]">
                  <div
                    className={clsx(
                      'transition-all duration-300 w-full overflow-hidden bg-white rounded-lg shadow-2xl',
                      previewMode === 'mobile' ? 'max-w-[375px] border-4 border-gray-800 rounded-3xl' : 'max-w-full'
                    )}
                  >
                    <iframe
                      srcDoc={compiledPreviewHtml}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                      className="w-full h-[450px] border-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Variable Tester Inputs */}
              <div className={clsx('p-4 rounded-2xl border glass space-y-3', isDark ? 'border-gray-800' : 'border-slate-200')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" /> Test Data Playground
                  </span>
                  <button
                    onClick={() => setTestVariables(DEFAULT_VARIABLES)}
                    className="text-[10px] text-gray-500 hover:text-white underline"
                  >
                    Reset Variables
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {detectedVariables.map((varKey) => (
                    <div key={varKey} className="space-y-0.5">
                      <label className="text-[10px] font-mono text-gray-400 block truncate">{varKey}</label>
                      <input
                        type="text"
                        value={testVariables[varKey] || ''}
                        onChange={(e) =>
                          setTestVariables((prev) => ({ ...prev, [varKey]: e.target.value }))
                        }
                        className={clsx(
                          'w-full px-2 py-1 rounded-lg border text-xs outline-none',
                          isDark ? 'bg-black/40 border-gray-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                        )}
                        placeholder={`Value for ${varKey}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Send Test to My Inbox */}
              <div className={clsx('p-4 rounded-2xl border glass space-y-3', isDark ? 'border-gray-800' : 'border-slate-200')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Send size={13} className="text-[#0066FF]" /> Send Test to Inbox
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Nodemailer Ready</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={quickTestEmail}
                    onChange={(e) => setQuickTestEmail(e.target.value)}
                    placeholder="Recipient email address"
                    className={clsx(
                      'flex-1 px-3 py-2 rounded-xl border text-xs outline-none',
                      isDark ? 'bg-black/30 border-gray-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    )}
                  />
                  <button
                    onClick={sendQuickTest}
                    disabled={sendingQuickTest}
                    className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0066dd] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingQuickTest ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    Send Test
                  </button>
                </div>

                {quickTestAlert && (
                  <div
                    className={clsx(
                      'p-2.5 rounded-xl border text-xs flex items-start gap-2',
                      quickTestAlert.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    )}
                  >
                    {quickTestAlert.type === 'success' ? (
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                    )}
                    <span className="break-all">{quickTestAlert.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: SEND EMAIL / BROADCAST COMPOSER
         ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'composer' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl glass border border-gray-800/80 space-y-6">
            <div>
              <h2 className={clsx('text-xl font-black mb-1', isDark ? 'text-white' : 'text-slate-900')}>
                Send Email Broadcast
              </h2>
              <p className="text-xs text-gray-500">
                Deliver high-converting, personalized notifications to specific users or any recipient address
              </p>
            </div>

            {/* Step 1: Select Template */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                1. Select Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={clsx(
                  'w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none',
                  isDark ? 'bg-black/40 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                )}
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category}) — {tpl.subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Recipient Audience */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  2. Select Recipient Audience
                </label>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                  {targetRecipients.length} recipient{targetRecipients.length === 1 ? '' : 's'} targeted
                </span>
              </div>

              {/* Audience Mode Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setComposerRecipientMode('all_users')}
                  className={clsx(
                    'p-3 rounded-2xl border text-left transition-all',
                    composerRecipientMode === 'all_users'
                      ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                      : isDark
                      ? 'bg-black/20 border-gray-800 text-gray-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  )}
                >
                  <div className="text-xs font-bold">👥 All Users</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{users.length} registered</div>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerRecipientMode('pro_users')}
                  className={clsx(
                    'p-3 rounded-2xl border text-left transition-all',
                    composerRecipientMode === 'pro_users'
                      ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                      : isDark
                      ? 'bg-black/20 border-gray-800 text-gray-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  )}
                >
                  <div className="text-xs font-bold">👑 Pro Users</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{users.filter((u) => u.pro_status).length} members</div>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerRecipientMode('free_users')}
                  className={clsx(
                    'p-3 rounded-2xl border text-left transition-all',
                    composerRecipientMode === 'free_users'
                      ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                      : isDark
                      ? 'bg-black/20 border-gray-800 text-gray-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  )}
                >
                  <div className="text-xs font-bold">🌱 Free Tier</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{users.filter((u) => !u.pro_status).length} users</div>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerRecipientMode('bulk_list')}
                  className={clsx(
                    'p-3 rounded-2xl border text-left transition-all',
                    composerRecipientMode === 'bulk_list'
                      ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                      : isDark
                      ? 'bg-black/20 border-gray-800 text-gray-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  )}
                >
                  <div className="text-xs font-bold">📋 Paste List</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Bulk custom emails</div>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerRecipientMode('single_user')}
                  className={clsx(
                    'p-3 rounded-2xl border text-left transition-all',
                    composerRecipientMode === 'single_user' || composerRecipientMode === 'custom_email'
                      ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                      : isDark
                      ? 'bg-black/20 border-gray-800 text-gray-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  )}
                >
                  <div className="text-xs font-bold">👤 Specific User</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Single destination</div>
                </button>
              </div>

              {/* Bulk Paste Area */}
              {composerRecipientMode === 'bulk_list' && (
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] text-gray-400 block">
                    Paste email addresses below (separate with commas, spaces, or new lines):
                  </label>
                  <textarea
                    rows={4}
                    value={composerBulkText}
                    onChange={(e) => setComposerBulkText(e.target.value)}
                    placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                    className={clsx(
                      'w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none transition-all',
                      isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                    )}
                  />
                </div>
              )}

              {/* Single User Dropdown / Custom Email Input */}
              {(composerRecipientMode === 'single_user' || composerRecipientMode === 'custom_email') && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setComposerRecipientMode('single_user')}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border',
                        composerRecipientMode === 'single_user'
                          ? 'bg-[#0066FF]/20 text-[#0066FF] border-[#0066FF]'
                          : 'bg-transparent text-gray-400 border-gray-800'
                      )}
                    >
                      Registered User ({users.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerRecipientMode('custom_email')}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border',
                        composerRecipientMode === 'custom_email'
                          ? 'bg-[#0066FF]/20 text-[#0066FF] border-[#0066FF]'
                          : 'bg-transparent text-gray-400 border-gray-800'
                      )}
                    >
                      Custom Email Address
                    </button>
                  </div>

                  {composerRecipientMode === 'single_user' ? (
                    <select
                      value={composerSelectedUserId}
                      onChange={(e) => handleComposerUserSelect(e.target.value)}
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-xl border text-xs font-semibold outline-none',
                        isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                      )}
                    >
                      <option value="">-- Choose a user --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.username || 'User'} ({u.email || 'No email'}) • {u.role} {u.pro_status ? '👑 Pro' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={composerCustomEmail}
                      onChange={(e) => setComposerCustomEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-xl border text-xs outline-none',
                        isDark ? 'bg-black/30 border-gray-800 text-white focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0066FF]'
                      )}
                    />
                  )}
                </div>
              )}

              {/* Recipient Chips Preview */}
              {targetRecipients.length > 0 && (
                <div className={clsx('p-3 rounded-2xl border text-xs space-y-1.5', isDark ? 'bg-black/25 border-gray-800/80' : 'bg-slate-50 border-slate-200')}>
                  <div className="text-[11px] font-bold text-gray-400">
                    Target Summary: Sending individual personalized emails to {targetRecipients.length} recipient{targetRecipients.length === 1 ? '' : 's'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetRecipients.slice(0, 5).map((r) => (
                      <span
                        key={r.email}
                        className={clsx(
                          'text-[10px] px-2 py-0.5 rounded-md font-mono border',
                          isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-slate-200 text-slate-700'
                        )}
                      >
                        {r.email} {r.name && r.name !== 'Groundwork Member' ? `(${r.name})` : ''}
                      </span>
                    ))}
                    {targetRecipients.length > 5 && (
                      <span className="text-[10px] text-gray-500 px-1 py-0.5 self-center">
                        +{targetRecipients.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Subject & Variable Overrides */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                3. Subject & Variables Customization
              </label>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  className={clsx(
                    'w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none',
                    isDark ? 'bg-black/30 border-gray-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {['user_name', 'action_url', 'update_title', 'pro_plan'].map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">{key}</label>
                    <input
                      type="text"
                      value={composerVariables[key] || ''}
                      placeholder={key === 'action_url' ? 'https://barok-labs.pro.et/open.html' : ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (key === 'action_url' && val.startsWith('/') && !val.startsWith('//')) {
                          val = `https://barok-labs.pro.et${val}`;
                        }
                        setComposerVariables((prev) => ({ ...prev, [key]: val }));
                      }}
                      className={clsx(
                        'w-full px-3 py-1.5 rounded-lg border text-xs outline-none',
                        isDark ? 'bg-black/30 border-gray-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Sender Info & Dispatch */}
            <div className="pt-4 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Mail size={14} className="text-[#0066FF]" />
                <span>
                  Sender: <strong>{smtpStatus.config?.fromEmail || 'barok.m.lakew@gmail.com'}</strong> via Gmail Nodemailer
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={sendTestToAdmin}
                  disabled={sendingComposer}
                  className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Eye size={14} /> Send 1 Test to Me
                </button>

                <button
                  type="button"
                  onClick={sendFromComposer}
                  disabled={sendingComposer || targetRecipients.length === 0}
                  className="flex-1 sm:flex-initial px-8 py-3 rounded-2xl bg-[#0066FF] hover:bg-[#0066dd] text-white text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingComposer ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  {targetRecipients.length > 1
                    ? `Send Broadcast (${targetRecipients.length})`
                    : 'Send Email Now'}
                </button>
              </div>
            </div>

            {/* Feedback Alert */}
            {composerFeedback && (
              <div
                className={clsx(
                  'p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3',
                  composerFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                )}
              >
                {composerFeedback.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                )}
                <span>{composerFeedback.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: SENT EMAIL LOGS & AUDIT HISTORY
         ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter logs by recipient or subject..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className={clsx(
                  'w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs outline-none',
                  isDark ? 'bg-gray-900/60 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-white/5"
              >
                <RefreshCw size={12} className={clsx(loadingLogs && 'animate-spin')} /> Refresh
              </button>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Clear Logs
                </button>
              )}
            </div>
          </div>

          {loadingLogs ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={clsx('h-16 rounded-xl animate-pulse', isDark ? 'bg-gray-900/40' : 'bg-slate-100')} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <History size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">No emails sent yet</p>
              <p className="text-xs mt-1">Sent emails and test messages will be recorded here</p>
            </div>
          ) : (
            <div className="rounded-2xl border glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={clsx('border-b text-[10px] uppercase font-bold text-gray-400', isDark ? 'bg-black/30 border-gray-800' : 'bg-slate-100 border-slate-200')}>
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Template</th>
                      <th className="px-4 py-3">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {logs
                      .filter(
                        (l) =>
                          l.recipient.toLowerCase().includes(logSearch.toLowerCase()) ||
                          l.subject.toLowerCase().includes(logSearch.toLowerCase())
                      )
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3.5">
                            <span
                              className={clsx(
                                'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border',
                                log.status === 'sent'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              )}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-white">{log.recipient}</td>
                          <td className="px-4 py-3.5 font-medium max-w-xs truncate text-gray-300">
                            {log.subject}
                            {log.error && <span className="block text-[10px] text-red-400 truncate">{log.error}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-gray-400">
                            {log.template_name || log.template_id || 'Freeform'}
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 text-[11px] whitespace-nowrap">
                            {new Date(log.sent_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SMTP Configuration Modal */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className={clsx(
              'w-full max-w-lg rounded-3xl border p-6 shadow-2xl relative',
              isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            )}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSmtpModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#0066FF]/15 text-[#0066FF] flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">Gmail SMTP Configuration</h3>
                <p className="text-xs text-gray-400">Configure credentials for automated email notifications & broadcasts</p>
              </div>
            </div>

            {/* Current Status Banner */}
            <div
              className={clsx(
                'p-3.5 rounded-2xl border text-xs mb-5 flex items-start gap-2.5',
                smtpStatus.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              )}
            >
              {smtpStatus.ok ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-[11px] leading-relaxed">
                <span className="font-bold block text-xs">
                  {smtpStatus.ok ? 'SMTP Authenticated & Connected' : 'SMTP Authentication Error'}
                </span>
                <span className="opacity-90">{smtpStatus.message}</span>
              </div>
            </div>

            {/* How-To Callout */}
            <div className={clsx('p-3.5 rounded-2xl border mb-5 text-xs', isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-slate-50 border-slate-200')}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[11px] text-[#0066FF] flex items-center gap-1.5">
                  <Sparkles size={13} /> How to get a Google App Password
                </span>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                >
                  Open Google <ExternalLink size={10} />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-400">
                <li>Ensure 2-Step Verification is active on your Google account.</li>
                <li>Go to <span className="font-mono text-gray-300">myaccount.google.com/apppasswords</span>.</li>
                <li>Enter app name <strong>Groundwork</strong> and click <strong>Create</strong>.</li>
                <li>Copy the 16-letter password and paste it below.</li>
              </ol>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Gmail Address
                </label>
                <input
                  type="email"
                  value={smtpFormUser}
                  onChange={(e) => setSmtpFormUser(e.target.value)}
                  placeholder="barok.m.lakew@gmail.com"
                  className={clsx(
                    'w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors outline-none',
                    isDark ? 'bg-gray-950 border-gray-800 focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 focus:border-[#0066FF]'
                  )}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  New 16-Character App Password
                </label>
                <input
                  type="text"
                  value={smtpFormPass}
                  onChange={(e) => setSmtpFormPass(e.target.value)}
                  placeholder="e.g. cvew qucc iuup yger"
                  className={clsx(
                    'w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-colors outline-none tracking-wider',
                    isDark ? 'bg-gray-950 border-gray-800 focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 focus:border-[#0066FF]'
                  )}
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Spaces are stripped automatically. Never enter your primary Google account password here.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={smtpFormFromName}
                  onChange={(e) => setSmtpFormFromName(e.target.value)}
                  placeholder="Groundwork"
                  className={clsx(
                    'w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors outline-none',
                    isDark ? 'bg-gray-950 border-gray-800 focus:border-[#0066FF]' : 'bg-slate-50 border-slate-200 focus:border-[#0066FF]'
                  )}
                />
              </div>
            </div>

            {/* Modal Feedback Alert */}
            {smtpModalFeedback && (
              <div
                className={clsx(
                  'p-3 rounded-xl border text-xs font-medium mb-4 flex items-center gap-2',
                  smtpModalFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                )}
              >
                {smtpModalFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                )}
                <span>{smtpModalFeedback.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSmtpModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-400 hover:text-white transition-colors border-gray-800"
              >
                Close
              </button>
              <button
                onClick={saveSmtpCredentials}
                disabled={smtpSaving || !smtpFormPass.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold shadow-lg hover:bg-[#0066dd] transition-all disabled:opacity-50"
              >
                {smtpSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Test & Save Credentials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
