## Pinned version of typedb driver to `2.25.3`

`TypeDB.enterpriseDriver` does not exist in version `2.26.5`. I suggest commiting the lock file to prevent indeterministic behavior in the long run.

## Add `it.failing` to failing test

For cleaning up tests and making incomplete feature easily readable

https://github.com/vaticle/typedb/issues/6857
https://github.com/vaticle/typedb-behaviour/blob/518e6ace0413c48f70903bded7ea5cb518d44170/query/language/fetch.feature

## Approach with `client.fetch`

To implement the pipeline for fetching data using the `fetch` clause from typedb, I utilized **fetch subqueries** for fetching all the relations in one single query. Comparing with making multiple requests, single query is going to be more performant and reduce network roundtrip.

The pipeline for `client.fetch` is similar to the existing pipeline, so it will not be foreign to developers who have been working on this project. I tried to reuse as much existing funtions and libraries in the project as possible.

The current minimalistic fetch pipeline only handles fetching `$entity` and its `relations`, and does not handle `roles`. It does not handle fetching `$relation`.

## Remark

I didn't pay close attention with my commit message, as there is not commit linting in the repo(and I want to finish this exercise quickly). I expect this branch to be squashed and merged as a PR, so all commit messages do not really matter.

After going through this exercise, I realize the need of a layer above `typedb-driver`, as that is too lower level. But if I were to make a decision today, I guess I will go for a TQL client layer that will transform the typedb's response into simple javascript objects and arrays. This TQL client layer sits between ORM and the `typedb-driver` layer, and expect TQL statement as input, which will be simpler to implement and easier to debug, so the team can focus on building other things.