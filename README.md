# curl: 
curl --location 'https://emetbrown.netlify.app/.netlify/functions/api/identifyContact' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1MzM5Yzg4MmM2YzA5ZTdhMzQyODZjNCIsImlhdCI6MTcwMTA5MjI2OCwiZXhwIjoxNzMyNjI4MjY4fQ.bRH5s7YGKSvSpqzM0aIyikM5JgD-u_wfBqHByYgOq4I' \
--data-raw '{
    "phoneNumber": "233456",
    "email": "lorraine@hillvalley.edu"
}'
