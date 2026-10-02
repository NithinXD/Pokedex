fetch('http://localhost:4000/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `mutation CreateTeam($name: String!, $trainer_id: ID!, $pokemon_ids: [Int!]!, $created_at: String!) {
      createTeam(name: $name, trainer_id: $trainer_id, pokemon_ids: $pokemon_ids, created_at: $created_at) {
        id
        name
      }
    }`,
    variables: {
      name: 'test2',
      trainer_id: "1",
      pokemon_ids: [1,2,3],
      created_at: new Date().toISOString()
    }
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
