# edly-curl

`edly-curl` is a simplified version of [curl](https://everything.curl.dev/) built as part of [john Crickets coding challenges](
https://codingchallenges.substack.com/p/coding-challenge-41-curl).
Currently `edly-curl` only supports
- GET
- POST
- PUT 
- DELETE

## Example usage
**Get request**
```shell
edly-curl -v http://eu.httpbin.org/get
```
**Delete request**
```shell
edly-curl -v -X DELETE http://eu.httpbin.org/delete
```
**Post request**
```shell
edly-curl -v -X POST http://eu.httpbin.org/post -d '{"key":"value"}' -H "Content-Type: application/json"
```

**Put request**
```shell
edly-curl -v -X PUT http://eu.httpbin.org/put -d '{"key":"value"}' -H "Content-Type: application/json"
```
The `-v` flag generates a verbose includes both the headers and response to makes a request.