if (!self.FMcp) self.FMcp = {};

// Poll for gig rows on the manage_gigs page (loaded via AJAX after document-idle)
async function waitForGigRows(timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = Array.from(document.querySelectorAll('.js-db-table tbody tr[data-id]'));
    if (rows.length > 0) return rows;
    await new Promise(r => setTimeout(r, 400));
  }
  return [];
}

// Parse a single gig row into a plain object
function parseGigRow(row) {
  const tds = Array.from(row.querySelectorAll('td'));
  return {
    id:          row.getAttribute('data-id') ?? '',
    slug:        row.getAttribute('data-slug') ?? '',
    title:       row.querySelector('td.title a')?.textContent.trim() ?? '',
    status:      row.querySelector('.js-cbx-gig-row')?.getAttribute('data-filter') ?? 'unknown',
    edit_url:    row.querySelector('a[href*="/edit"]')?.href ?? '',
    impressions: parseInt(tds[4]?.textContent.trim() || '0', 10) || 0,
    clicks:      parseInt(tds[5]?.textContent.trim() || '0', 10) || 0,
    orders:      parseInt(tds[6]?.textContent.trim() || '0', 10) || 0,
  };
}

// ── list_gigs ────────────────────────────────────────────────────────────────
self.FMcp.list_gigs = async function() {
  const rows = await waitForGigRows();
  if (!rows.length) throw new Error('No gig rows found — is the manage_gigs page loaded?');
  return rows.map(parseGigRow);
};

// ── get_gig (runs on the EDIT page, not manage_gigs) ─────────────────────────
self.FMcp.get_gig = async function({ gigId }) {
  // Wait for the edit form to be present
  await self.FMcp.waitFor('input[name="title"]');
  const titleEl = document.querySelector('input[name="title"]');
  const descEl  = document.querySelector('.fr-element') ??
                  document.querySelector('[data-testid="description-editor"]');
  return {
    id:          String(gigId),
    title:       titleEl?.value ?? '',
    description: descEl?.textContent ?? '',
  };
};

// ── pause_gig ────────────────────────────────────────────────────────────────
self.FMcp.pause_gig = async function({ gigId }) {
  const rows = await waitForGigRows();
  const row = rows.find(r => r.getAttribute('data-id') === String(gigId));
  if (!row) throw new Error(`Gig ${gigId} not found`);

  const form = row.querySelector('form[action*="/suspend"]');
  if (!form) throw new Error(`Pause form not found for gig ${gigId} — gig may already be paused`);

  form.querySelector('input[type="submit"]').click();
  await new Promise(r => setTimeout(r, 1500));
  return `Gig ${gigId} paused`;
};

// ── activate_gig (runs on manage_gigs?current_filter=suspend) ────────────────
self.FMcp.activate_gig = async function({ gigId }) {
  const rows = await waitForGigRows();
  const row = rows.find(r => r.getAttribute('data-id') === String(gigId));
  if (!row) throw new Error(`Gig ${gigId} not found in the paused gigs list`);

  const form = row.querySelector('form[action*="/activate"]');
  if (!form) throw new Error(`Activate form not found for gig ${gigId}`);

  form.querySelector('input[type="submit"]').click();
  await new Promise(r => setTimeout(r, 1500));
  return `Gig ${gigId} activated`;
};

// ── delete_gig ───────────────────────────────────────────────────────────────
self.FMcp.delete_gig = async function({ gigId }) {
  const rows = await waitForGigRows();
  const row = rows.find(r => r.getAttribute('data-id') === String(gigId));
  if (!row) throw new Error(`Gig ${gigId} not found`);

  const form = row.querySelector('form.js-delete-gig-form, form[action*="/delete"]');
  if (!form) throw new Error(`Delete form not found for gig ${gigId}`);

  form.querySelector('input[type="submit"]').click();
  await new Promise(r => setTimeout(r, 1500));
  return `Gig ${gigId} deleted`;
};

// ── update_gig (runs on the EDIT page) ───────────────────────────────────────
self.FMcp.update_gig = async function({ gigId, title, description, tags, packages, faq, requirements }) {
  await self.FMcp.waitFor('input[name="title"]');

  if (title !== undefined) {
    const el = document.querySelector('input[name="title"]');
    if (el) {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.value = title;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (description !== undefined) {
    const el = document.querySelector('.fr-element') ??
               document.querySelector('[data-testid="description-editor"]');
    if (el) { el.textContent = description; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  if (tags !== undefined) {
    // Clear existing tags
    const removeButtons = document.querySelectorAll('[data-testid="remove-tag"], .js-remove-tag');
    for (const btn of removeButtons) btn.click();
    await new Promise(r => setTimeout(r, 500));
    // Add new tags
    for (const tag of tags) {
      const input = document.querySelector('[data-testid="tags-input"], input.js-tag-input');
      if (input) {
        input.value = tag;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // Click Save/Publish
  const saveBtn = document.querySelector('[data-testid="publish-btn"], button[type="submit"].save-btn, .save-btn');
  if (!saveBtn) throw new Error('Save/Publish button not found on gig edit page');
  saveBtn.click();
  await new Promise(r => setTimeout(r, 1500));
  return `Gig ${gigId} updated successfully`;
};

// ── create_gig ───────────────────────────────────────────────────────────────
self.FMcp.create_gig = async function(params) {
  // Step 1: Overview
  const titleEl = await self.FMcp.waitFor('input[name="title"]');
  titleEl.value = '';
  titleEl.dispatchEvent(new Event('input', { bubbles: true }));
  titleEl.value = params.title;
  titleEl.dispatchEvent(new Event('input', { bubbles: true }));
  titleEl.dispatchEvent(new Event('change', { bubbles: true }));

  if (params.category) {
    const cat = document.querySelector('select[name="category"]');
    if (cat) { cat.value = params.category; cat.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  if (params.subcategory) {
    const sub = document.querySelector('select[name="subcategory"]');
    if (sub) { sub.value = params.subcategory; sub.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  if (params.tags) {
    for (const tag of params.tags) {
      const input = document.querySelector('[data-testid="tags-input"]');
      if (input) {
        input.value = tag;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  const nextBtn1 = document.querySelector('[data-testid="next-btn"]');
  if (!nextBtn1) throw new Error('Next button not found at step 1');
  nextBtn1.click();
  await self.FMcp.waitFor('[data-package]');

  // Step 2: Packages
  if (params.packages) {
    for (const pkg of params.packages) {
      const priceEl = document.querySelector(`[data-package="${pkg.name}"] [name="price"]`);
      if (priceEl) { priceEl.value = String(pkg.price); priceEl.dispatchEvent(new Event('input', { bubbles: true })); }
      const delivEl = document.querySelector(`[data-package="${pkg.name}"] [name="delivery_time"]`);
      if (delivEl) { delivEl.value = String(pkg.deliveryDays); delivEl.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }
  const nextBtn2 = document.querySelector('[data-testid="next-btn"]');
  if (!nextBtn2) throw new Error('Next button not found at step 2');
  nextBtn2.click();
  await self.FMcp.waitFor('.fr-element');

  // Step 3: Description & FAQ
  if (params.description) {
    const desc = document.querySelector('.fr-element');
    if (desc) { desc.textContent = params.description; desc.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  if (params.faq) {
    for (const item of params.faq) {
      document.querySelector('[data-testid="add-faq-btn"]')?.click();
      await new Promise(r => setTimeout(r, 200));
      const questions = document.querySelectorAll('[data-testid="faq-question"]');
      const answers   = document.querySelectorAll('[data-testid="faq-answer"]');
      const last = questions.length - 1;
      if (questions[last]) { questions[last].value = item.question; questions[last].dispatchEvent(new Event('input', { bubbles: true })); }
      if (answers[last])   { answers[last].value   = item.answer;   answers[last].dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }
  const nextBtn3 = document.querySelector('[data-testid="next-btn"]');
  if (!nextBtn3) throw new Error('Next button not found at step 3');
  nextBtn3.click();
  await self.FMcp.waitFor('[data-testid="add-requirement-btn"]');

  // Step 4: Requirements
  if (params.requirements) {
    for (const req of params.requirements) {
      document.querySelector('[data-testid="add-requirement-btn"]')?.click();
      await new Promise(r => setTimeout(r, 200));
      const inputs = document.querySelectorAll('[data-testid="requirement-input"]');
      const last = inputs[inputs.length - 1];
      if (last) { last.value = req; last.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }
  const nextBtn4 = document.querySelector('[data-testid="next-btn"]');
  if (!nextBtn4) throw new Error('Next button not found at step 4');
  nextBtn4.click();
  await self.FMcp.waitFor('[data-testid="publish-btn"]');

  // Step 5: Publish
  const publishBtn = document.querySelector('[data-testid="publish-btn"]');
  if (!publishBtn) throw new Error('Publish button not found');
  publishBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  const gigId = window.location.href.match(/gigs\/([^/?#]+)/)?.[1];
  if (!gigId) throw new Error('Gig published but could not extract ID from URL: ' + window.location.href);
  return `Gig created successfully. ID: ${gigId}`;
};
