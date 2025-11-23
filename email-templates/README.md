# Digis Email Templates

Beautiful, branded email templates for Supabase authentication emails using Resend SMTP.

## 📧 Templates Included

1. **confirm-signup.html** - Email confirmation for new signups
2. **magic-link.html** - Passwordless sign-in magic link
3. **reset-password.html** - Password reset emails

## 🎨 Features

- ✨ Digis gradient branding (cyan → purple → pink)
- 📱 Fully responsive design
- 🌙 Dark theme matching the app
- 🎯 Clear call-to-action buttons
- 🔒 Security notices and best practices
- ⏱️ Expiry time indicators
- 🔗 Fallback text links for accessibility

## 🚀 How to Use

### Step 1: Configure Supabase SMTP with Resend

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → Auth
2. Scroll to **SMTP Settings**
3. Enable Custom SMTP and enter:
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **User**: `resend`
   - **Password**: Your Resend API key (starts with `re_`)
   - **Sender Email**: `noreply@digis.cc`
   - **Sender Name**: `Digis`

### Step 2: Update Email Templates in Supabase

1. Go to: Authentication → Email Templates
2. For each template type:
   - Click "Edit Template"
   - Copy the HTML from the corresponding file
   - Paste into the template editor
   - Save changes

#### Template Mappings:

| Supabase Template | File to Use |
|------------------|-------------|
| Confirm signup | `confirm-signup.html` |
| Magic Link | `magic-link.html` |
| Reset Password | `reset-password.html` |
| Change Email | Use `confirm-signup.html` as base |

### Step 3: Test Your Emails

1. Try signing up with a new account
2. Request a password reset
3. Check that emails arrive with proper branding
4. Verify all links work correctly

## 🔧 Template Variables

Supabase provides these variables you can use:

- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .Token }}` - The raw token (if needed)
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

## 📝 Customization Tips

### Update Colors
The gradient uses these brand colors:
```css
#00D4FF (cyan)
#9D4EDD (purple)
#FF006E (pink)
```

### Update Links
Replace `https://digis.cc` with your actual domain.

### Add Your Logo
Replace the text header with an image:
```html
<img src="https://digis.cc/logo.png" alt="Digis" width="150" />
```

## 🎯 Best Practices

✅ Always test emails in multiple email clients
✅ Check spam scores using tools like mail-tester.com
✅ Monitor delivery rates in Resend dashboard
✅ Keep templates under 100KB for best deliverability
✅ Include plain text versions for accessibility

## 🛠️ Troubleshooting

**Emails not sending?**
- Verify DNS records are set up in Resend
- Check API key permissions
- Ensure domain is verified in Resend
- Check Supabase logs for errors

**Styling issues?**
- Email clients have limited CSS support
- Use inline styles (already done in templates)
- Test in Litmus or Email on Acid

**Links not working?**
- Ensure `{{ .ConfirmationURL }}` is used correctly
- Check redirect URLs in Supabase settings
- Verify SITE_URL environment variable

## 📞 Support

Need help? Contact support@digis.cc
