import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, mobile, pan, dob, gender, score, rating, bureau, report_id, source } = body;

    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!hubspotToken) {
      console.log('[HubSpot Integration] Local log (No HUBSPOT_ACCESS_TOKEN set):', { name, mobile, pan, score });
      return NextResponse.json({
        success: true,
        mode: 'queued_local',
        message: 'Lead captured locally. Add HUBSPOT_ACCESS_TOKEN to .env to push directly to your HubSpot CRM account.',
      });
    }

    const nameParts = (name || '').trim().split(' ');
    const firstname = nameParts[0] || 'Visitor';
    const lastname = nameParts.slice(1).join(' ') || firstname;
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    const contactEmail = body.email && body.email.includes('@') ? body.email : `${cleanMobile || 'lead'}@creditconsultant.in`;

    // Universal HubSpot CRM v3 Built-in Contact Properties
    // Uses 'jobtitle' and 'address' which are guaranteed built-in fields in all HubSpot portals
    const properties: Record<string, string> = {
      firstname,
      lastname,
      phone: cleanMobile || mobile || '',
      email: contactEmail,
      company: bureau || 'Equifax',
      jobtitle: `Credit Score: ${score || 0} (${rating || 'Good'})`,
      address: `PAN: ${pan || 'N/A'} | DOB: ${dob || 'N/A'} | Gender: ${gender || 'N/A'} | Report ID: ${report_id || 'N/A'} | Source: ${source || 'Credit Consultant Web'}`,
    };

    // 1. Attempt to CREATE new contact
    const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hubspotToken}`,
      },
      body: JSON.stringify({ properties }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      return NextResponse.json({ success: true, hubspot_id: data.id, action: 'created' });
    }

    const errText = await createRes.text();
    console.warn('[HubSpot POST failed, attempting auto-update for existing contact]:', createRes.status, errText);

    // 2. If contact already exists (HTTP 409 or HTTP 400 Duplicate), extract ID or search and PATCH update
    let existingId: string | null = null;
    const idMatch = errText.match(/Existing ID:\s*(\d+)/i);
    if (idMatch && idMatch[1]) {
      existingId = idMatch[1];
    }

    // If ID not found directly in error string, search HubSpot CRM by email or phone
    if (!existingId) {
      try {
        const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hubspotToken}`,
          },
          body: JSON.stringify({
            filterGroups: [
              { filters: [{ propertyName: 'email', operator: 'EQ', value: contactEmail }] },
              { filters: [{ propertyName: 'phone', operator: 'EQ', value: cleanMobile }] },
            ],
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            existingId = searchData.results[0].id;
          }
        }
      } catch (searchErr) {
        console.error('[HubSpot Search Error]:', searchErr);
      }
    }

    // 3. If existing contact ID is resolved, PATCH update the contact record
    if (existingId) {
      const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hubspotToken}`,
        },
        body: JSON.stringify({ properties }),
      });

      if (patchRes.ok) {
        const patchData = await patchRes.json();
        return NextResponse.json({ success: true, hubspot_id: patchData.id, action: 'updated' });
      }
    }

    // If neither create nor update succeeded, return formatted error response
    return NextResponse.json({ success: false, error: errText }, { status: createRes.status });
  } catch (err: any) {
    console.error('[HubSpot Sync Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
