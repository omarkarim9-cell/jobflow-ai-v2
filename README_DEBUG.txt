DEBUGGING INSTRUCTIONS

1. In JobFlow AI, go to the "Selected Jobs" tab.
2. Click the "Export CSV" button.
3. Rename the downloaded file to "jobflow_debug.csv".
4. Place the CSV file in the same folder as "debug_filters.py".
5. Open your terminal or command prompt.
6. Run the script:
   python debug_filters.py

The script will list every job from your export and explain exactly why it PASSED (found an IT keyword) or FAILED (no keyword or contained excluded word).