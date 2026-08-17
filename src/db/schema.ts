import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable(
  'items',
  {
    id: integer('id').primaryKey(),
    titulo: text('titulo').notNull(),
    categoria: text('categoria').notNull(),
    distrito: text('distrito'),
    concelho: text('concelho'),
    valor_minimo: real('valor_minimo'),
    valor_mercado: real('valor_mercado'),
    data_publicacao: text('data_publicacao'),
    data_encerramento: text('data_encerramento'),
    url: text('url'),
    raw_json: text('raw_json'),
    refreshed_at: text('refreshed_at').notNull(),
  },
  (t) => ({
    catIdx: index('idx_items_categoria').on(t.categoria),
    distIdx: index('idx_items_distrito').on(t.distrito),
    encIdx: index('idx_items_encerramento').on(t.data_encerramento),
  })
);

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  distrito: text('distrito'),
  concelho: text('concelho'),
  categoria: text('categoria'),
  valor_max: real('valor_max'),
  desconto_min: real('desconto_min'),
  only_novos_24h: integer('only_novos_24h', { mode: 'boolean' }).default(false),
  active: integer('active', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull(),
});

export const crawlLog = sqliteTable('crawl_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  started_at: text('started_at').notNull(),
  finished_at: text('finished_at'),
  items_added: integer('items_added').default(0),
  items_updated: integer('items_updated').default(0),
  items_removed: integer('items_removed').default(0),
  status: text('status').notNull(),
  error_message: text('error_message'),
});