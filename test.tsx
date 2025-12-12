' curl -v -X PUT -H "Content-Type: image/jpeg" --data-binary @cat.jpg http://localhost:3000/200 '

' curl -v http://localhost:3000/200 --output test_200.jpg '

' curl -v -X DELETE http://localhost:3000/200 '

' curl -v http://localhost:3000/200 '