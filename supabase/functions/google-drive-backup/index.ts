import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { action, backupData, fileId } = await req.json();
    
    // Get the user's Google OAuth token from Supabase Auth
    const { data: identities } = await supabase.auth.admin.getUserById(user.id);
    const googleIdentity = identities.user?.identities?.find(
      (identity: any) => identity.provider === 'google'
    );
    
    if (!googleIdentity) {
      return new Response(
        JSON.stringify({ 
          error: 'Google account not connected', 
          needsConnection: true 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get fresh access token using refresh token
    const { data: sessionData } = await supabase.auth.admin.getUserById(user.id);
    
    // For Google Drive API, we need to get the provider token
    // This requires the user to have granted drive.file scope
    const providerToken = req.headers.get('x-provider-token');
    
    if (!providerToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Drive access token required. Please reconnect your Google account with Drive permissions.',
          needsReconnect: true
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing ${action} request for user ${user.id}`);

    switch (action) {
      case 'upload': {
        // Create or update backup file in Google Drive
        const fileName = `xpenzy-backup-${new Date().toISOString().split('T')[0]}.json`;
        const fileContent = JSON.stringify(backupData, null, 2);
        
        // Check if backup folder exists, create if not
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='Xpenzy Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
            },
          }
        );
        
        const folderData = await folderResponse.json();
        let folderId: string;
        
        if (folderData.files && folderData.files.length > 0) {
          folderId = folderData.files[0].id;
        } else {
          // Create folder
          const createFolderResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'Xpenzy Backups',
                mimeType: 'application/vnd.google-apps.folder',
              }),
            }
          );
          
          const newFolder = await createFolderResponse.json();
          folderId = newFolder.id;
          console.log('Created Xpenzy Backups folder:', folderId);
        }
        
        // Upload file using multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        
        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
        };
        
        const multipartBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          fileContent +
          closeDelimiter;
        
        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${providerToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Failed to upload backup: ${errorText}`);
        }
        
        const uploadedFile = await uploadResponse.json();
        console.log('Backup uploaded successfully:', uploadedFile.id);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            fileId: uploadedFile.id,
            fileName: uploadedFile.name,
            message: 'Backup uploaded to Google Drive'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      case 'list': {
        // List all Xpenzy backups
        const listResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name contains 'xpenzy-backup' and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`,
          {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
            },
          }
        );
        
        if (!listResponse.ok) {
          throw new Error('Failed to list backups');
        }
        
        const listData = await listResponse.json();
        console.log('Found backups:', listData.files?.length || 0);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            backups: listData.files || [] 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      case 'download': {
        if (!fileId) {
          throw new Error('File ID required for download');
        }
        
        const downloadResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
            },
          }
        );
        
        if (!downloadResponse.ok) {
          throw new Error('Failed to download backup');
        }
        
        const backupContent = await downloadResponse.json();
        console.log('Backup downloaded successfully');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: backupContent 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      case 'check': {
        // Just check if Google Drive is accessible
        const checkResponse = await fetch(
          'https://www.googleapis.com/drive/v3/about?fields=user',
          {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
            },
          }
        );
        
        if (!checkResponse.ok) {
          return new Response(
            JSON.stringify({ 
              connected: false,
              error: 'Cannot access Google Drive'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const aboutData = await checkResponse.json();
        
        return new Response(
          JSON.stringify({ 
            connected: true,
            email: aboutData.user?.emailAddress,
            displayName: aboutData.user?.displayName
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error('Google Drive backup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
