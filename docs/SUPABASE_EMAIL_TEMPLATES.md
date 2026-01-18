# Supabase Email Templates for Digis

Copy these templates into your Supabase Dashboard:
**Authentication → Email Templates**

Make sure SMTP is configured to use Resend:
- **SMTP Host:** `smtp.resend.com`
- **Port:** `465`
- **Username:** `resend`
- **Password:** Your Resend API key (`re_xxxx...`)
- **Sender email:** `noreply@digis.cc`
- **Sender name:** `Digis`

---

## 1. Confirm Signup

**Subject:**
```
Verify your email for Digis ✨
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">✨</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">
                Verify Your Email
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Hey there! 👋
              </p>

              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.7;">
                Thanks for signing up for Digis! Click the button below to verify your email address and get started.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © 2024 Digis. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link (Passwordless Login)

**Subject:**
```
Your Digis login link 🔐
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login to Digis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">🔐</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">
                Your Login Link
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Hey! 👋
              </p>

              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.7;">
                Click the button below to log in to your Digis account. No password needed!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                      Log In to Digis
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 20px; padding-right: 12px; vertical-align: top;">⚠️</td>
                        <td style="color: #d1d5db; font-size: 13px; line-height: 1.5;">
                          This link expires in 1 hour. If you didn't request this, someone may have entered your email by mistake — you can ignore this.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © 2024 Digis. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password

**Subject:**
```
Reset your Digis password 🔑
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">🔑</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">
                Reset Your Password
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Hey there! 👋
              </p>

              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.7;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 20px; padding-right: 12px; vertical-align: top;">🔒</td>
                        <td style="color: #d1d5db; font-size: 13px; line-height: 1.5;">
                          <strong>Didn't request this?</strong> If you didn't ask for a password reset, please ignore this email. Your password will remain unchanged.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                This link expires in 1 hour.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © 2024 Digis. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:**
```
Confirm your new email address 📧
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">📧</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">
                Confirm New Email
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Hey! 👋
              </p>

              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.7;">
                You requested to change your email address. Click below to confirm this new email.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                If you didn't request this change, please contact support immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © 2024 Digis. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Invite User (Optional)

**Subject:**
```
You've been invited to Digis! 🎉
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">🎉</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">
                You're Invited!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Hey! 👋
              </p>

              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.7;">
                You've been invited to join Digis — the platform where creators earn from their content, calls, and connections.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                This invitation expires in 7 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © 2024 Digis. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Quick Setup Checklist

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. For each template above:
   - Click the template type (Confirm signup, Magic Link, etc.)
   - Paste the **Subject** line
   - Paste the **HTML Body**
   - Click **Save**
3. Go to **SMTP Settings**:
   - Enable custom SMTP
   - Enter Resend credentials
   - Test with a real email
4. Done! All emails now go through Resend with Digis branding 🎉
