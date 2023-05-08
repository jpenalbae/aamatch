# Websocket CMDS

There are two main types of meessages:
  - cmd: sent from the client to the server
  - push: sent from the server to the client


## cmd

Main format is:

```json
{ 'cmd': 'some_cmd', ...}
```


### find_casual

The user is looking for a casual match

```json
{ 'cmd': 'find_casual'}
```


### ready

The user is ready to play

```json
{ 'cmd': 'ready'}
```

### ready

Send chat message to the opponent

```json
{ 'cmd': 'chat', 'message': 'hello'}
```


## push

Main format is:

```json
{ 'push': 'push_cmd', ...}
```

### matched

```json
{ 'push': 'matched', 'matchid': 'e5e8d241-531a-45aa-a3e1-3ae1e037c564'}
```

### timeout

```json
{ 'push': 'timeout', 'type': 'queue'}
```

Timed out while waiting for `type`. Where types can be:
 - queue
 - match


### msg

```json
{ 'push': 'msg', type: 'error', 'message': 'notify something to the user'}
```

Where type can be:
 - error
 - info


### ready

Both players are ready to play

```json
{ 'push': 'ready'}
```

### chat

Send message to the opponent

```json
{ 'push': 'chat', 'message': 'hello'}
```



# Normal flow for a game


Seach for a casual game using the `/api/a/queue` websocket.

```txt

User1 <----> Server

-------> { cmd: 'find_casual'}
<------- { push: 'msg', type: 'info', message: 'queued'}

User2 <----> Server

-------> { cmd: 'find_casual'}
<------- { push: 'msg', type: 'info', message: 'A player has been found'}
<------- { push: 'matched', matchid: 'e5e8d241-531a-45aa-a3e1-3ae1e037c564'}

User1 <----> Server

<------- { push: 'matched', matchid: 'e5e8d241-531a-45aa-a3e1-3ae1e037c564'}

```

Now both players move to websocket `/api/a/match/e5e8d241-531a-45aa-a3e1-3ae1e037c564`

```txt

User1 <----> Server

-------> { cmd: 'ready'}

User2 <----> Server

-------> { cmd: 'ready'}
<------- { push: 'ready', matchid: '....'. opponent: 'username', fccode: 'nitendo_code'}

User1 <----> Server
<------- { push: 'ready', matchid: '....'. opponent: 'username', fccode: 'nitendo_code'}


```

Now players can play and chat using the websocket. When the match is finished they
can report the result.

```txt
User1 <----> Server

-------> { cmd: 'win'}

User2 <----> Server

-------> { cmd: 'loose'}
<------- { push: 'end'}


User1 <----> Server
<------- { push: 'end'}

```