Request

1.	axios.post("http://localhost:8080/register", {name : "Krishna",
						                          email : "krishna127@yahoo.com",
						                          pwd : "hashonxgs"}, 
							                     {headers : {content-type : "application-json"}})

    [Headers hold the information about the request, while the body contains the actual data]

2.  axios.post(`http://localhost:8080/login?username=${variableName}&password=${pwdVariable}`)    [Request Parameters]

3.  axios.post(`http://localhost:8080/getUserData/${variableName}`) [Path Parameters]
 __________________________________________________________________________________________________________________________
|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
|**************************************************************************************************************************|
|__________________________________________________________________________________________________________________________|

Response

1.  return ResponseEntitiy<?> ResponseEntitiy.status(HttpStatus.OK)