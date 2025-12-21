
/**
 * Service for interacting with the Local File System via the File System Access API.
 * Includes a VIRTUAL FALLBACK for environments where the API is blocked (like iframes).
 */

export interface VirtualDirectoryHandle {
  kind: 'directory';
  name: string;
  isVirtual: true;
}

// Check if API is supported
export const isFileSystemSupported = () => {
  return 'showDirectoryPicker' in window;
};

// SEED DATA for Virtual Files
const SAMPLE_JOBS_TXT = `https://www.linkedin.com/jobs/view/senior-react-developer-123
https://www.indeed.com/viewjob?jk=react-frontend-456
https://weworkremotely.com/remote-jobs/full-stack-engineer
`;

export const createVirtualDirectory = (pathName: string): VirtualDirectoryHandle => {
  console.log(`Creating virtual directory: ${pathName}`);
  
  // Auto-Seed files if they don't exist in virtual storage
  // Note: We DO NOT seed resume.txt anymore to force user upload/paste.
  if (!localStorage.getItem('virtual_jobs.txt')) {
    localStorage.setItem('virtual_jobs.txt', SAMPLE_JOBS_TXT);
  }

  return {
    kind: 'directory',
    name: pathName,
    isVirtual: true
  };
};

export const getDirectoryHandle = async () => {
  if (!isFileSystemSupported()) {
      throw new Error("Browser not supported");
  }

  try {
    // @ts-ignore 
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    return handle;
  } catch (error: any) {
    if (error.name === 'AbortError') return null;

    // If blocked by security, throw specific error
    if (error.message && (error.message.includes('Cross origin sub frames') || error.name === 'SecurityError')) {
        throw new Error("Security Restriction: The browser blocked access. Try opening this app in a new independent window.");
    }
    throw error;
  }
};

export const writeFileToDirectory = async (dirHandle: any, filename: string, content: string) => {
  // VIRTUAL MODE
  if (dirHandle.isVirtual) {
      try {
          localStorage.setItem(`virtual_${filename}`, content);
          console.log(`[Virtual FS] Wrote to ${filename}`);
          return true;
      } catch (e) {
          throw new Error("Quota exceeded in virtual storage.");
      }
  }

  // REAL MODE
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (error: any) {
    console.error(`Failed to write ${filename}:`, error);
    throw new Error(`Failed to write file: ${error.message}`);
  }
};

export const readFileFromDirectory = async (dirHandle: any, filename: string): Promise<string> => {
  // VIRTUAL MODE
  if (dirHandle.isVirtual) {
      const content = localStorage.getItem(`virtual_${filename}`);
      if (content === null) {
          throw new Error(`File not found in virtual workspace: ${filename}`);
      }
      console.log(`[Virtual FS] Read from ${filename}`);
      return content;
  }

  // REAL MODE
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error: any) {
    console.error(`Failed to read ${filename}:`, error);
    throw new Error(`File not found: ${filename}`);
  }
};
