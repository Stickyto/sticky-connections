module.exports = async function getRelevantOrders(dlr, groupTime) {
  const {rows: orders} = await dlr._.sql(`
    WITH RelevantThings AS (
        SELECT
            thing_id
        FROM
            order_batches
        WHERE
            deleted_at IS NULL
            AND created_at < NOW() - INTERVAL '${groupTime} seconds'
        GROUP BY
            thing_id
    )
    SELECT
        ob.*
    FROM
        order_batches ob
    INNER JOIN
        RelevantThings rt ON ob.thing_id = rt.thing_id
    WHERE
        ob.deleted_at IS NULL
    ORDER BY
        ob.created_at ASC;
  `)
  return orders
}